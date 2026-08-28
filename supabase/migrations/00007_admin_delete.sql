-- 00007_admin_delete.sql
-- Allow admins to remove any member's event (moderation), in addition to
-- the owner/participant rule already in can_edit_event().
-- Also allow admins to edit any event.

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete
  using (public.can_edit_event(id) or public.is_admin());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update
  using (public.can_edit_event(id) or public.is_admin())
  with check (public.can_edit_event(id) or public.is_admin());