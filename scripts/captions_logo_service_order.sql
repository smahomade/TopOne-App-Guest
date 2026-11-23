-- Applied to the live project as migration `captions_logo_service_order` (2026-11-23).

-- Collections: a bundle can show a line of text under each image. It's off by
-- default and switched on per bundle in the staff app ("Add subtext for each
-- image"). Each image can have its own caption; without one, the old
-- "year · subtitle" line is shown.
alter table public.collections add column if not exists show_captions boolean not null default false;
alter table public.collections add column if not exists caption text;

-- Services: keeps the menu in the same order as the salon's website price list.
-- Services added later in the staff app have no number and go to the end.
alter table public.services add column if not exists sort_order integer;

-- Salon-wide settings that staff change from the staff app. For now only
-- `logo_url`: the logo both apps show, uploaded to the public `images` bucket.
create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Anyone can read app settings"
  on public.app_settings for select
  to anon, authenticated
  using (true);

create policy "Staff can add app settings"
  on public.app_settings for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "Staff can change app settings"
  on public.app_settings for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "Staff can remove app settings"
  on public.app_settings for delete
  to authenticated
  using ((select public.is_staff()));

grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;
