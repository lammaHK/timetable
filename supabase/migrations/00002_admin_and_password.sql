-- 002_admin_and_password.sql
-- Add user profiles (role / active), password login support, and admin member-management.

-- profiles -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'member' check (role in ('member','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill profiles for existing users
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

-- user can read their own profile; admins can read all profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- No direct insert/update/delete policies on profiles: admin actions go
-- through the security-definer functions below (caller can't forge).

-- admin function: set a member's active flag and / or role -------------
create or replace function public.admin_update_member(
  target_id uuid,
  p_is_active boolean default null,
  p_role text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'only admins may manage members';
  end if;
  update public.profiles
  set is_active = coalesce(p_is_active, is_active),
      role      = coalesce(p_role, role),
      updated_at = now()
  where id = target_id;
end $$;

revoke all on function public.admin_update_member from public;
grant execute on function public.admin_update_member to authenticated;

-- events: members visibility should exclude deactivated members ---------
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select
  using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (
      visibility = 'members'
      and auth.role() = 'authenticated'
      and exists (
        select 1 from public.profiles
        where id = auth.uid() and is_active = true
      )
    )
  );