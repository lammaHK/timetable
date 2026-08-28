-- 00005_participants_specific_and_revisions.sql
-- Requirements:
--   5) event participants (multiple members) + shared edit ability
--   11) "specific members only" visibility
--   9) revision history with reason, for late re-edits

-- 11: extend events.visibility to include 'specific'
alter table public.events drop constraint if exists events_visibility_check;
alter table public.events
  add constraint events_visibility_check check (visibility in ('private','members','public','specific'));

-- 5: participants (many-to-many)
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_participants_event_idx on public.event_participants(event_id);
create index if not exists event_participants_user_idx  on public.event_participants(user_id);
alter table public.event_participants enable row level security;

-- Participants can read the participants list; anyone who can see the event too.
drop policy if exists participants_select on public.event_participants;
create policy participants_select on public.event_participants
  for select using (true); -- fine: participation isn't sensitive

-- Only owner OR participants can add/remove participants (via RPC below), no direct DML.

-- 11: specific-members visibility list
create table if not exists public.event_visibility_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_visibility_members_event_idx on public.event_visibility_members(event_id);
create index if not exists event_visibility_members_user_idx  on public.event_visibility_members(user_id);
alter table public.event_visibility_members enable row level security;

drop policy if exists visibility_members_select on public.event_visibility_members;
create policy visibility_members_select on public.event_visibility_members
  for select using (true);

-- 9: revision history
create table if not exists public.event_revisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  changed_by uuid not null references auth.users(id) on delete cascade,
  reason text,
  prev_title text,
  prev_start_time time,
  prev_end_time time,
  prev_all_day boolean,
  prev_note text,
  prev_visibility text,
  created_at timestamptz not null default now()
);
create index if not exists event_revisions_event_idx on public.event_revisions(event_id);
alter table public.event_revisions enable row level security;

-- Who can read revisions: owner or a participant of that event.
drop policy if exists revisions_select on public.event_revisions;
create policy revisions_select on public.event_revisions
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_revisions.event_id
        and (e.owner_id = auth.uid()
             or exists (select 1 from public.event_participants ep where ep.event_id = e.id and ep.user_id = auth.uid()))
    )
  );

-- Insert into revisions only via the guarded RPC below.

-- Helper: is this user owner or participant of an event?
create or replace function public.can_edit_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (e.owner_id = auth.uid()
           or exists (select 1 from public.event_participants ep where ep.event_id = e.id and ep.user_id = auth.uid()))
  );
$$;

revoke all on function public.can_edit_event(uuid) from public;
grant execute on function public.can_edit_event(uuid) to authenticated;

-- Rewrite events RLS to use can_edit_event + specific-members visibility.
drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update
  using (public.can_edit_event(id))
  with check (public.can_edit_event(id));

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete
  using (public.can_edit_event(id));

-- select: owner / public / members / specific-listed
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select
  using (
    owner_id = auth.uid()
    or visibility = 'public'
    or (visibility = 'members' and auth.role() = 'authenticated')
    or (
      visibility = 'specific'
      and auth.role() = 'authenticated'
      and exists (
        select 1 from public.event_visibility_members vm
        where vm.event_id = events.id and vm.user_id = auth.uid()
      )
    )
  );

-- RPC: add / remove participant (owner or participant only)
create or replace function public.set_participants(p_event_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  if not public.can_edit_event(p_event_id) then
    raise exception 'you cannot modify participants for this event';
  end if;
  delete from public.event_participants where event_id = p_event_id;
  foreach uid in array p_user_ids loop
    insert into public.event_participants (event_id, user_id) values (p_event_id, uid)
    on conflict (event_id, user_id) do nothing;
  end loop;
end $$;

revoke all on function public.set_participants(uuid, uuid[]) from public;
grant execute on function public.set_participants(uuid, uuid[]) to authenticated;

-- RPC: set specific-visibility members
create or replace function public.set_visibility_members(p_event_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  if not public.can_edit_event(p_event_id) then
    raise exception 'you cannot change visibility for this event';
  end if;
  delete from public.event_visibility_members where event_id = p_event_id;
  foreach uid in array p_user_ids loop
    insert into public.event_visibility_members (event_id, user_id) values (p_event_id, uid)
    on conflict (event_id, user_id) do nothing;
  end loop;
end $$;

revoke all on function public.set_visibility_members(uuid, uuid[]) from public;
grant execute on function public.set_visibility_members(uuid, uuid[]) to authenticated;

-- RPC: record a revision
create or replace function public.add_revision(
  p_event_id uuid,
  p_reason text,
  p_prev_title text,
  p_prev_start_time time,
  p_prev_end_time time,
  p_prev_all_day boolean,
  p_prev_note text,
  p_prev_visibility text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_edit_event(p_event_id) then
    raise exception 'you cannot revise this event';
  end if;
  insert into public.event_revisions (event_id, changed_by, reason, prev_title, prev_start_time, prev_end_time, prev_all_day, prev_note, prev_visibility)
  values (p_event_id, auth.uid(), p_reason, p_prev_title, p_prev_start_time, p_prev_end_time, p_prev_all_day, p_prev_note, p_prev_visibility);
end $$;

revoke all on function public.add_revision(uuid, text, text, time, time, boolean, text, text) from public;
grant execute on function public.add_revision(uuid, text, text, time, time, boolean, text, text) to authenticated;

-- RPC: list revisions for an event (guarded read)
create or replace function public.list_revisions(p_event_id uuid)
returns setof public.event_revisions
language sql
stable
security definer
set search_path = public
as $$
  select r.* from public.event_revisions r
  where r.event_id = p_event_id
    and exists (
      select 1 from public.events e
      where e.id = r.event_id
        and (e.owner_id = auth.uid()
             or exists (select 1 from public.event_participants ep where ep.event_id = e.id and ep.user_id = auth.uid()))
    )
  order by r.created_at desc;
$$;

revoke all on function public.list_revisions(uuid) from public;
grant execute on function public.list_revisions(uuid) to authenticated;