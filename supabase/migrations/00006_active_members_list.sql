-- 00006_active_members_list.sql
-- Allow any signed-in member to see the basic list of other active members
-- (to pick participants / specific-visibility targets). Only id + display info.

create or replace function public.list_active_members()
returns table (id uuid, email text, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.email, p.full_name
  from public.profiles p
  where p.is_active = true
    and p.id <> auth.uid()
  order by p.full_name nulls last, p.email;
$$;

revoke all on function public.list_active_members() from public;
grant execute on function public.list_active_members() to authenticated;