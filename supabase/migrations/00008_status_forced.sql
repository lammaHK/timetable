-- 00008_status_forced.sql
-- Add events.status for cancel/forced-change support, and record a "previous"
-- snapshot inside the revision so "曾經是甚麼" is preserved.

alter table public.events add column if not exists status text not null default 'active'
  check (status in ('active','cancelled'));

-- revision already stores prev_*; ensure it also has prev_status for cancel record
alter table public.event_revisions add column if not exists prev_status text;