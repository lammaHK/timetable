-- 003_fix_admin_recursion.sql
-- Avoid RLS infinite recursion: profiles admin policy queries the same table.
-- Replace with a security-definer helper function accessible to authenticated users.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- rewrite the profiles admin SELECT policy to use the helper
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select
  using (public.is_admin());

-- defence in depth: also guard the admin RPC via the helper
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
begin
  if not public.is_admin() then
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
