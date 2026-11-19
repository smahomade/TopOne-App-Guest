-- Email people about messages they haven't read.
--
-- Applied to the live project as the `message_notifications` migration
-- (without the begin/commit, since migrations run in one transaction).
--
-- Before this script nothing told the salon that a booking request had
-- arrived, and nothing told a customer that the salon had replied. Both
-- sides had to open their app to find out.
--
-- After it, once a minute the database looks for messages that are still
-- unread 5 minutes after they were sent. If there are any, it calls the
-- notify-unread-messages Edge Function (supabase/functions/), which emails:
--   * a customer's message -> the salon location it was sent to
--                             (locations.email, or SALON_NOTIFY_EMAIL)
--   * a salon reply        -> the customer's sign-in email address
--
-- Rules:
--   * Nothing is sent if someone reads the message in the app first.
--   * Each conversation gets at most one email an hour in each direction.
--     Messages that arrive in between go into the next one.
--   * Messages more than 2 days old are never emailed, so turning this on
--     doesn't send anything about old unread messages.
--   * A failed send is retried after 2, 4, 8, 16 and 32 minutes, then left
--     with the reason in message_email_notifications.last_error.
--
-- The Edge Function needs the RESEND_API_KEY and NOTIFY_FROM secrets; see
-- the comment at the top of supabase/functions/notify-unread-messages.
--
-- Safe to re-run.

begin;

create extension if not exists pg_net with schema extensions;

------------------------------------------------------------------------
-- 1. What has been emailed
--
-- One row per message once it has been picked up for an email. Only the
-- database and the Edge Function use it: row-level security is on with
-- no policies, so neither app can read or change it.
------------------------------------------------------------------------
create table if not exists public.message_email_notifications (
  message_id uuid primary key references public.messages (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  attempts integer not null default 0,
  sent_at timestamptz,
  last_error text
);

alter table public.message_email_notifications enable row level security;
revoke all on public.message_email_notifications from anon, authenticated;

-- The once-a-minute check reads unread messages and whole conversations.
create index if not exists messages_unread_created_at_idx
  on public.messages (created_at) where is_read = false;
create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id, created_at);

------------------------------------------------------------------------
-- 2. Which messages are due an email
--
-- A conversation is due in one direction (to the salon, or to the
-- customer) when its oldest waiting message has been unread for
-- notify_after, it hasn't been emailed in that direction for resend_gap,
-- and no email for it is being sent right now. All of its waiting
-- messages then go into one email, so a burst of replies isn't split.
------------------------------------------------------------------------
create or replace function public.message_emails_due(
  notify_after interval default interval '5 minutes',
  look_back interval default interval '2 days',
  resend_gap interval default interval '1 hour',
  max_attempts integer default 6
)
returns table (message_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with waiting as (
    -- Unread, not emailed yet, and not waiting for a retry.
    select m.id, m.conversation_id, m.sender_is_admin, m.created_at
    from public.messages m
    left join public.message_email_notifications n on n.message_id = m.id
    where m.is_read = false
      and m.conversation_id is not null
      and m.created_at > now() - look_back
      and (
        n.message_id is null
        or (
          n.sent_at is null
          and n.attempts < max_attempts
          and n.claimed_at < now() - interval '1 minute' * power(2, n.attempts)
        )
      )
  ),
  due as (
    select w.conversation_id, w.sender_is_admin
    from waiting w
    group by w.conversation_id, w.sender_is_admin
    having min(w.created_at) <= now() - notify_after
  )
  select w.id
  from waiting w
  join due d
    on d.conversation_id = w.conversation_id
   and d.sender_is_admin = w.sender_is_admin
  where not exists (
    select 1
    from public.message_email_notifications n
    join public.messages m on m.id = n.message_id
    where m.conversation_id = d.conversation_id
      and m.sender_is_admin = d.sender_is_admin
      and (
        -- emailed recently
        n.sent_at > now() - resend_gap
        -- being emailed right now
        or (n.sent_at is null and n.last_error is null and n.claimed_at > now() - interval '5 minutes')
      )
  );
$$;

create or replace function public.message_emails_are_due()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.message_emails_due());
$$;

------------------------------------------------------------------------
-- 3. Hand due messages to the Edge Function, and hear back from it
--
-- claim_message_emails marks the due messages as being emailed and
-- returns one row per email to send. The token must match the Vault
-- secret the cron job sends, so calling the function's public address
-- by hand does nothing. Claims are taken one at a time, so two runs that
-- overlap can't email the same message twice.
------------------------------------------------------------------------
drop function if exists public.claim_message_emails(text);
create function public.claim_message_emails(token text)
returns table (
  conversation_id uuid,
  to_salon boolean,
  to_email text,
  customer_name text,
  location_name text,
  location_email text,
  is_booking boolean,
  messages jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if token is null or token is distinct from (
    select decrypted_secret from vault.decrypted_secrets where name = 'message_email_token'
  ) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.claim_message_emails'));

  return query
  with claimed as (
    insert into public.message_email_notifications as n (message_id, claimed_at, attempts)
    select d.message_id, now(), 1
    from public.message_emails_due() d
    on conflict (message_id) do update
      set claimed_at = excluded.claimed_at,
          attempts = n.attempts + 1,
          last_error = null
    returning n.message_id
  ),
  grouped as (
    select
      m.conversation_id as conv_id,
      not m.sender_is_admin as for_salon,
      -- Every message in a conversation carries the customer's user_id,
      -- salon replies included.
      (array_agg(m.user_id))[1] as customer_id,
      jsonb_agg(
        jsonb_build_object('id', m.id, 'content', m.content, 'created_at', m.created_at)
        order by m.created_at
      ) as msgs
    from claimed c
    join public.messages m on m.id = c.message_id
    group by m.conversation_id, m.sender_is_admin
  )
  select
    g.conv_id,
    g.for_salon,
    case when g.for_salon then l.email else u.email::text end,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    l.name,
    l.email,
    exists (
      select 1
      from public.messages b
      where b.conversation_id = g.conv_id
        and b.sender_is_admin = false
        and b.content like '%BOOKING_REQUEST%'
    ),
    g.msgs
  from grouped g
  left join public.profiles p on p.id = g.customer_id
  left join auth.users u on u.id = g.customer_id
  left join lateral (
    -- The salon the conversation was most recently sent to.
    select loc.name, loc.email
    from public.messages lm
    join public.locations loc on loc.id = lm.location_id
    where lm.conversation_id = g.conv_id
    order by lm.created_at desc
    limit 1
  ) l on true;
end;
$$;

-- failure is null when the email was sent.
create or replace function public.record_message_emails(message_ids uuid[], failure text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.message_email_notifications
  set sent_at = case when failure is null then now() end,
      last_error = left(failure, 500)
  where message_id = any (message_ids)
    and sent_at is null;
$$;

revoke execute on function public.message_emails_due(interval, interval, interval, integer) from public, anon, authenticated;
revoke execute on function public.message_emails_are_due() from public, anon, authenticated;
revoke execute on function public.claim_message_emails(text) from public, anon, authenticated;
revoke execute on function public.record_message_emails(uuid[], text) from public, anon, authenticated;
grant execute on function public.claim_message_emails(text) to service_role;
grant execute on function public.record_message_emails(uuid[], text) to service_role;

------------------------------------------------------------------------
-- 4. The token the cron job proves itself with
--
-- Made here, inside the database, the first time this script runs. It
-- never needs copying anywhere: the cron job reads it from Vault and
-- claim_message_emails checks it against Vault.
------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'message_email_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'message_email_token',
      'Sent by the email-unread-messages cron job to the notify-unread-messages Edge Function'
    );
  end if;
end
$$;

------------------------------------------------------------------------
-- 5. Check once a minute
--
-- The Edge Function is only called when something is due, so a quiet
-- minute costs one small query and no function call. Re-running
-- schedule() with the same name replaces the job.
------------------------------------------------------------------------
select cron.schedule(
  'email-unread-messages',
  '* * * * *',
  $job$
  select net.http_post(
    url := 'https://unqumatnqfczxpsrbkmz.supabase.co/functions/v1/notify-unread-messages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-token', (select decrypted_secret from vault.decrypted_secrets where name = 'message_email_token')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  where public.message_emails_are_due();
  $job$
);

-- A job that runs every minute adds 1,440 rows a day to the cron log.
-- Keep a week of it.
select cron.schedule(
  'clear-cron-history',
  '30 3 * * *',
  $job$delete from cron.job_run_details where end_time < now() - interval '7 days'$job$
);

commit;

-- Check it's running:
--   select jobname, schedule, active from cron.job;
--   select status, start_time, return_message
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'email-unread-messages')
--   order by start_time desc limit 10;
--
-- What has been emailed, and anything that failed:
--   select n.*, m.sender_is_admin, m.created_at
--   from public.message_email_notifications n
--   join public.messages m on m.id = n.message_id
--   order by n.claimed_at desc limit 20;
--
-- The Edge Function's replies (kept for 6 hours):
--   select status_code, content, created
--   from net._http_response order by created desc limit 10;
--
-- To turn it off:
--   select cron.unschedule('email-unread-messages');
