-- Lock down who can read and change what in Supabase.
--
-- Before this script, anyone holding the app's public key (it ships inside
-- both apps) could edit or delete banners, services, collections and
-- locations, read every customer's name and phone number, upload files to
-- the image buckets, and make themselves staff by setting their own
-- profiles.admin_code.
--
-- After it:
--   * Signed-out visitors can only read the salon's public content.
--   * Customers can read and edit only their own profile and messages.
--   * Only staff can change salon content, read all conversations and
--     upload or delete images.
--   * Nobody can give themselves staff access from an app. New staff are
--     added by setting admin_code in the Supabase dashboard
--     (Table Editor -> profiles), which runs with full rights.
--
-- "Staff" means profiles.admin_code IS NOT NULL, the same rule both apps
-- already use, so existing staff logins keep working.
--
-- Safe to re-run.

begin;

------------------------------------------------------------------------
-- 1. One shared staff check
--
-- SECURITY DEFINER so policies on profiles can call it without recursing
-- into their own row-level security.
------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and admin_code is not null
  );
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

------------------------------------------------------------------------
-- 2. Table privileges
--
-- Signed-out visitors never write anything. TRUNCATE ignores row-level
-- security, so no app role should hold it.
------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;
revoke truncate, references, trigger
  on all tables in schema public from authenticated;

------------------------------------------------------------------------
-- 3. Salon content: anyone can read, only staff can change
------------------------------------------------------------------------
drop policy if exists "public can insert banners" on public.banners;
drop policy if exists "public can update banners" on public.banners;
drop policy if exists "public can delete banners" on public.banners;

drop policy if exists "public can insert collection" on public.collections;
drop policy if exists "public can update collection" on public.collections;
drop policy if exists "public can delete collection" on public.collections;

drop policy if exists "public can insert locations" on public.locations;
drop policy if exists "public can update locations" on public.locations;
drop policy if exists "public can delete locations" on public.locations;

drop policy if exists "Enable insert for users based on user_id" on public.services;
drop policy if exists "Enable update for users based on email" on public.services;
drop policy if exists "Enable delete for users based on user_id" on public.services;

-- opening_times checked admin_code > 0, which locked out the staff
-- account whose code is 0. It now uses the same rule as everything else.
drop policy if exists "Allow admin insert on opening_times" on public.opening_times;
drop policy if exists "Allow admin update on opening_times" on public.opening_times;
drop policy if exists "Allow admin delete on opening_times" on public.opening_times;

do $$
declare
  t text;
begin
  foreach t in array array['banners', 'collections', 'locations', 'services', 'opening_times'] loop
    execute format('drop policy if exists "Staff can insert" on public.%I', t);
    execute format('drop policy if exists "Staff can update" on public.%I', t);
    execute format('drop policy if exists "Staff can delete" on public.%I', t);

    execute format(
      'create policy "Staff can insert" on public.%I for insert to authenticated
         with check ((select public.is_staff()))', t);
    execute format(
      'create policy "Staff can update" on public.%I for update to authenticated
         using ((select public.is_staff()))
         with check ((select public.is_staff()))', t);
    execute format(
      'create policy "Staff can delete" on public.%I for delete to authenticated
         using ((select public.is_staff()))', t);
  end loop;
end
$$;

------------------------------------------------------------------------
-- 4. Profiles: private to their owner and to staff
------------------------------------------------------------------------
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users see own profile, staff see all" on public.profiles;
create policy "Users see own profile, staff see all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile."
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- admin_code can only be set or changed from the dashboard or by the
-- database itself, never by a signed-in app user, including staff.
create or replace function public.protect_admin_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.admin_code is not null then
      raise exception 'Staff access can only be granted by the salon owner'
        using errcode = '42501';
    elsif tg_op = 'UPDATE' and new.admin_code is distinct from old.admin_code then
      raise exception 'Staff access can only be granted by the salon owner'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_admin_code() from public, anon, authenticated;

drop trigger if exists protect_admin_code on public.profiles;
create trigger protect_admin_code
  before insert or update on public.profiles
  for each row execute function public.protect_admin_code();

------------------------------------------------------------------------
-- 5. Messages
--
-- Customers send only as themselves and never as the salon. Staff send
-- replies into any conversation. Once sent, a message's text can't be
-- edited by anyone; apps can only mark it read.
------------------------------------------------------------------------
drop policy if exists "Insert messages" on public.messages;
drop policy if exists "Read messages" on public.messages;
drop policy if exists "Admins can read all messages" on public.messages;
drop policy if exists "Update messages" on public.messages;
drop policy if exists "Admins can update all messages" on public.messages;

drop policy if exists "Customers send own messages, staff reply" on public.messages;
create policy "Customers send own messages, staff reply"
  on public.messages for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and sender_is_admin = false)
    or (select public.is_staff())
  );

drop policy if exists "Users read own messages, staff read all" on public.messages;
create policy "Users read own messages, staff read all"
  on public.messages for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "Users mark own messages read, staff mark all" on public.messages;
create policy "Users mark own messages read, staff mark all"
  on public.messages for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()))
  with check (user_id = (select auth.uid()) or (select public.is_staff()));

revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;

------------------------------------------------------------------------
-- 6. Conversation open/closed state: staff manage it, customers read
--    their own (the existing "Users can read their conversation
--    metadata" policy stays as it is).
------------------------------------------------------------------------
drop policy if exists "admin_full_access" on public.conversation_metadata;
drop policy if exists "Staff manage conversation state" on public.conversation_metadata;
create policy "Staff manage conversation state"
  on public.conversation_metadata for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

------------------------------------------------------------------------
-- 7. Storage: anyone can view salon images, only staff can change them
------------------------------------------------------------------------
drop policy if exists "Give access to a file to user 168dori_1" on storage.objects;  -- collection insert
drop policy if exists "Give access to a file to user 168dori_2" on storage.objects;  -- collection update
drop policy if exists "Give access to a file to user 168dori_3" on storage.objects;  -- collection delete
drop policy if exists "testInsert 1ffg0oo_0" on storage.objects;                     -- images insert
drop policy if exists "testUpdate 1ffg0oo_0" on storage.objects;                     -- images update
drop policy if exists "testDelete 1ffg0oo_0" on storage.objects;                     -- images delete

-- Neither app uses the avatars bucket, and this let anyone upload files.
drop policy if exists "Anyone can upload an avatar." on storage.objects;

drop policy if exists "Staff upload salon images" on storage.objects;
create policy "Staff upload salon images"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('collection', 'images') and (select public.is_staff()));

drop policy if exists "Staff replace salon images" on storage.objects;
create policy "Staff replace salon images"
  on storage.objects for update to authenticated
  using (bucket_id in ('collection', 'images') and (select public.is_staff()))
  with check (bucket_id in ('collection', 'images') and (select public.is_staff()));

drop policy if exists "Staff delete salon images" on storage.objects;
create policy "Staff delete salon images"
  on storage.objects for delete to authenticated
  using (bucket_id in ('collection', 'images') and (select public.is_staff()));

------------------------------------------------------------------------
-- 8. Functions flagged by the Supabase security advisor
--
-- Trigger functions don't need EXECUTE to fire, so no app role should be
-- able to call them directly.
------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.close_conversations_on_location_delete() from public, anon, authenticated;
alter function public.close_conversations_on_location_delete() set search_path = '';

commit;
