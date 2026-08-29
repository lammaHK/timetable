-- 00011_avatar_color.sql
-- allow members to set an avatar color.
alter table public.profiles add column if not exists avatar_color text;

create or replace function public.set_avatar_color(p_color text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set avatar_color = p_color where id = auth.uid();
$$;
revoke all on function public.set_avatar_color(text) from public;
grant execute on function public.set_avatar_color(text) to authenticated;