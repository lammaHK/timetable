-- 00004_presets.sql
-- Admin-defined preset event templates + calendar date coloring.

-- event_presets: templates admins create that users can quickly apply when adding an event.
create table if not exists public.event_presets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  start_time time,
  end_time time,
  all_day boolean not null default false,
  note text,
  visibility text not null default 'members'
    check (visibility in ('private','members','public')),
  color text, -- optional accent color for calendar date marker
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists event_presets_owner_idx on public.event_presets(created_by);

alter table public.event_presets enable row level security;

-- everyone (authenticated) can READ presets so they can apply them
drop policy if exists event_presets_select on public.event_presets;
create policy event_presets_select on public.event_presets
  for select using (auth.role() = 'authenticated');

-- only admins can modify presets via the admin_update_preset RPC (no direct DML)

-- admin function: create / update / delete a preset
create or replace function public.upsert_preset(
  p_id uuid default null,
  p_title text default null,
  p_start_time time default null,
  p_end_time time default null,
  p_all_day boolean default false,
  p_note text default null,
  p_visibility text default 'members',
  p_color text default null,
  p_sort_order int default 100
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'only admins may manage presets';
  end if;
  if p_id is null then
    insert into public.event_presets (created_by, title, start_time, end_time, all_day, note, visibility, color, sort_order)
    values (auth.uid(), coalesce(p_title,''), p_start_time, p_end_time, p_all_day, p_note, p_visibility, p_color, p_sort_order)
    returning id into new_id;
  else
    update public.event_presets
    set title = coalesce(p_title, title),
        start_time = coalesce(p_start_time, start_time),
        end_time = coalesce(p_end_time, end_time),
        all_day = p_all_day,
        note = coalesce(p_note, note),
        visibility = coalesce(p_visibility, visibility),
        color = coalesce(p_color, color),
        sort_order = coalesce(p_sort_order, sort_order)
    where id = p_id;
    return p_id;
  end if;
  return new_id;
end $$;

revoke all on function public.upsert_preset from public;
grant execute on function public.upsert_preset to authenticated;

create or replace function public.delete_preset(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins may manage presets';
  end if;
  delete from public.event_presets where id = p_id;
end $$;

revoke all on function public.delete_preset from public;
grant execute on function public.delete_preset to authenticated;

-- events: optional link to the preset it was created from (for color/theme tracking)
alter table public.events add column if not exists preset_id uuid references public.event_presets(id) on delete set null;