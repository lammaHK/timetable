-- 00009_group_dates.sql
-- allow a single event to span multiple dates (consecutive or separate)
-- by replicating the event across dates sharing a group_id.

alter table public.events add column if not exists group_id uuid;