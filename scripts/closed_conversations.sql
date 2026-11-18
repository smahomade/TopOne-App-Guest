-- Closed conversations: enforce them in the database and show them live.
--
-- Applied to the live project as the `closed_conversations` migration.
--
-- 1. Customers can't add messages to a conversation the salon has closed.
--    The customer app also checks before sending, but its copy of the
--    conversation can be out of date, so the database has the final say.
--    Staff can still post in a closed conversation.
-- 2. Closing and reopening are sent to the apps live, so the customer's
--    screen changes as soon as the salon closes or reopens a conversation.

------------------------------------------------------------------------
-- 1. Refuse customer messages to a closed conversation
------------------------------------------------------------------------

-- SECURITY DEFINER so the check doesn't go through conversation_metadata's
-- own access rules, which look at messages and would loop back to this
-- policy ("infinite recursion detected in policy").
create or replace function public.is_conversation_closed(conv uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_metadata
    where conversation_id = conv
      and closed_at is not null
  );
$$;

revoke execute on function public.is_conversation_closed(uuid) from public, anon;
grant execute on function public.is_conversation_closed(uuid) to authenticated;

drop policy if exists "Customers send own messages, staff reply" on public.messages;
create policy "Customers send own messages, staff reply"
  on public.messages for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and sender_is_admin = false
      and not public.is_conversation_closed(conversation_id)
    )
    or (select public.is_staff())
  );

------------------------------------------------------------------------
-- 2. Send close/reopen to the apps live
------------------------------------------------------------------------

-- Each customer only receives changes for conversations they can read
-- ("Users can read their conversation metadata").
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_metadata'
  ) then
    alter publication supabase_realtime add table public.conversation_metadata;
  end if;
end $$;
