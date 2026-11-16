-- Account deletion, required by both app stores for apps that allow signup.
--
-- Runs as the function owner (security definer) so it can reach auth.users,
-- but only ever deletes the caller's own rows via auth.uid(). There is no
-- parameter to pass someone else's id.
--
-- Run once in Supabase -> SQL Editor.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Conversation metadata is keyed by conversation, not user, so clear it
  -- before the messages that point at it - afterwards it is unreachable.
  delete from public.conversation_metadata
  where conversation_id in (
    select conversation_id from public.messages where user_id = uid
  );

  delete from public.messages where user_id = uid;
  delete from public.profiles where id = uid;

  -- Removing the auth user invalidates their session and refresh tokens.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
