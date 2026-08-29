-- 00010_include_self.sql
-- allow picking yourself as a participant: list includes the caller too.
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
  order by p.full_name nulls last, p.email;
$$;

revoke all on function public.list_active_members() from public;
grant execute on function public.list_active_members() to authenticated;