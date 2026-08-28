-- TimeTable schema: events (shared timetable) + user_settings + Row Level Security.
-- Visibility model (applied entirely via RLS):
--   'public'  -> every visitor (including anonymous) can read
--   'members' -> any signed-in user can read
--   'private' -> only the owner can read

-- events ---------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_name text,
  date date not null,
  start_time time,
  end_time time,
  all_day boolean not null default false,
  title text not null default '',
  note text,
  visibility text not null default 'members'
    check (visibility in ('private','members','public')),
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_date_idx  on public.events(date);
create index if not exists events_owner_idx on public.events(owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select
  using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'members' and auth.role() = 'authenticated')
  );

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert
  with check (owner_id = auth.uid());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete
  using (owner_id = auth.uid());

-- user_settings ---------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_visibility text not null default 'members'
    check (default_visibility in ('private','members','public')),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  lang text not null default 'zh'     check (lang in ('en','zh')),
  week_starts_on text not null default 'mon' check (week_starts_on in ('mon','sun')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists settings_select on public.user_settings;
create policy settings_select on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists settings_insert on public.user_settings;
create policy settings_insert on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists settings_update on public.user_settings;
create policy settings_update on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists settings_delete on public.user_settings;
create policy settings_delete on public.user_settings
  for delete using (auth.uid() = user_id);
