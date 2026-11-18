-- Automatic purge of old conversations.
--
--   Closed enquiries : deleted 14 days after they were closed.
--   Open enquiries   : deleted 90 days after the LAST MESSAGE, so an active
--                      conversation is never deleted mid-chat.
--
-- Replaces the client-side sweep in the admin app, which only ran when an
-- admin opened the Book tab and failed silently under RLS.
--
-- Run once in Supabase -> SQL Editor. Safe to re-run; it replaces itself.

create extension if not exists pg_cron;

-- Clear out the earlier closed-only version if it was already installed.
select cron.unschedule('purge-closed-conversations')
where exists (select 1 from cron.job where jobname = 'purge-closed-conversations');

drop function if exists public.purge_closed_conversations();

create or replace function public.purge_old_conversations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  ----------------------------------------------------------------------
  -- Rule 1: closed enquiries, 14 days after closing.
  ----------------------------------------------------------------------
  delete from public.messages
  where conversation_id in (
    select conversation_id
    from public.conversation_metadata
    where closed_at is not null
      and closed_at < now() - interval '14 days'
  );

  delete from public.conversation_metadata
  where closed_at is not null
    and closed_at < now() - interval '14 days';

  ----------------------------------------------------------------------
  -- Rule 2: open enquiries, 90 days after the last message.
  -- Metadata is deleted first - once the messages are gone there is
  -- nothing left to measure the age against.
  ----------------------------------------------------------------------
  delete from public.conversation_metadata cm
  where cm.closed_at is null
    and (
      select max(m.created_at)
      from public.messages m
      where m.conversation_id = cm.conversation_id
    ) < now() - interval '90 days';

  delete from public.messages m
  where m.conversation_id in (
    select conversation_id
    from public.messages
    group by conversation_id
    having max(created_at) < now() - interval '90 days'
  )
  -- Recently closed conversations are Rule 1's business, not Rule 2's.
  and not exists (
    select 1
    from public.conversation_metadata cm
    where cm.conversation_id = m.conversation_id
      and cm.closed_at is not null
  );
end;
$$;

revoke all on function public.purge_old_conversations() from public, anon, authenticated;

-- 03:00 UTC daily. Re-running schedule() with the same name replaces it.
select cron.schedule(
  'purge-old-conversations',
  '0 3 * * *',
  $$select public.purge_old_conversations();$$
);

-- Check it registered:
--   select jobname, schedule, active from cron.job;
-- Check it ran:
--   select jobname, status, start_time, return_message
--   from cron.job_run_details order by start_time desc limit 10;
