import { supabase } from '../lib/supabase'
import { isBackendConfigured } from '../lib/config'
import type { AppEvent, EventPreset, EventRevision, Profile, UserSettings, Visibility } from '../lib/types'

export async function fetchMonthEvents(year: number, month: number): Promise<AppEvent[]> {
  if (!isBackendConfigured) return []
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const end = `${year}-${String(month + 1).padStart(2, '0')}-31`
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('fetchMonthEvents', error)
    return []
  }
  return (data ?? []) as AppEvent[]
}

export async function fetchDayEvents(date: string): Promise<AppEvent[]> {
  if (!isBackendConfigured) return []
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('date', date)
    .order('sort_order', { ascending: true })
    .order('start_time', { ascending: true })
  if (error) {
    console.error('fetchDayEvents', error)
    return []
  }
  return (data ?? []) as AppEvent[]
}

export interface EventInput {
  owner_id: string
  owner_name?: string | null
  date: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  title: string
  note: string | null
  visibility: Visibility
  sort_order: number
  preset_id?: string | null
  group_id?: string | null
}

export async function createEvent(input: EventInput): Promise<AppEvent | null> {
  const { data, error } = await supabase.from('events').insert(input).select().single()
  if (error) {
    console.error('createEvent', error)
    return null
  }
  return data as AppEvent
}

/** Create the same event across multiple dates, sharing one group_id. */
export async function createGroupEvents(dates: string[], base: Omit<EventInput, 'date' | 'group_id'>): Promise<boolean> {
  const groupId = crypto.randomUUID()
  const rows = dates.map((date) => ({ ...base, date, group_id: groupId }))
  const { error } = await supabase.from('events').insert(rows)
  if (error) {
    console.error('createGroupEvents', error)
    return false
  }
  return true
}

export async function updateEvent(id: string, patch: Partial<AppEvent>): Promise<boolean> {
  const { error } = await supabase.from('events').update(patch).eq('id', id)
  if (error) {
    console.error('updateEvent', error)
    return false
  }
  return true
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) {
    console.error('deleteEvent', error)
    return false
  }
  return true
}

export async function fetchSettings(userId: string): Promise<UserSettings | null> {
  if (!isBackendConfigured) return null
  const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
  return (data as UserSettings) ?? null
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isBackendConfigured) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return (data as Profile) ?? null
}

/** Admin: list all members (profiles) — only returns rows if caller is admin (RLS). */
export async function fetchAllProfiles(): Promise<Profile[]> {
  if (!isBackendConfigured) return []
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
  if (error) {
    console.error('fetchAllProfiles', error)
    return []
  }
  return (data ?? []) as Profile[]
}

/** Admin: update a member's active flag and / or role. */
export async function adminUpdateMember(targetId: string, patch: { is_active?: boolean; role?: Profile['role'] }): Promise<boolean> {
  if (!isBackendConfigured) return false
  const { error } = await supabase.rpc('admin_update_member', { target_id: targetId, p_is_active: patch.is_active, p_role: patch.role ?? null })
  if (error) {
    console.error('adminUpdateMember', error)
    return false
  }
  return true
}

// ---- Event presets ----

export async function fetchPresets(): Promise<EventPreset[]> {
  if (!isBackendConfigured) return []
  const { data, error } = await supabase.from('event_presets').select('*').order('sort_order', { ascending: true })
  if (error) {
    console.error('fetchPresets', error)
    return []
  }
  return (data ?? []) as EventPreset[]
}

export async function upsertPreset(input: Partial<EventPreset>): Promise<EventPreset | null> {
  const { data, error } = await supabase.rpc('upsert_preset', {
    p_id: input.id ?? null,
    p_title: input.title ?? null,
    p_start_time: input.start_time ?? null,
    p_end_time: input.end_time ?? null,
    p_all_day: input.all_day ?? false,
    p_note: input.note ?? null,
    p_visibility: input.visibility ?? 'members',
    p_color: input.color ?? null,
    p_sort_order: input.sort_order ?? 100,
  })
  if (error) {
    console.error('upsertPreset', error)
    return null
  }
  // RPC returns the id; refetch to get the full row
  const id = Array.isArray(data) ? data[0] : data
  const { data: row } = await supabase.from('event_presets').select('*').eq('id', id).maybeSingle()
  return (row as EventPreset) ?? null
}

export async function deletePreset(id: string): Promise<boolean> {
  const { error } = await supabase.rpc('delete_preset', { p_id: id })
  if (error) {
    console.error('deletePreset', error)
    return false
  }
  return true
}

// ---- Participants / specific visibility / revisions ----

export async function setParticipants(eventId: string, userIds: string[]): Promise<boolean> {
  const { error } = await supabase.rpc('set_participants', { p_event_id: eventId, p_user_ids: userIds })
  if (error) {
    console.error('setParticipants', error)
    return false
  }
  return true
}

export async function fetchParticipantIds(eventId: string): Promise<string[]> {
  const { data, error } = await supabase.from('event_participants').select('user_id').eq('event_id', eventId)
  if (error) {
    console.error('fetchParticipantIds', error)
    return []
  }
  return (data ?? []).map((r: { user_id: string }) => r.user_id)
}

/** Fetch display names of participants grouped by event_id. */
export async function fetchEventsParticipants(eventIds: string[]): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {}
  if (!eventIds.length) return map
  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id, user_id')
    .in('event_id', eventIds)
  if (error) {
    console.error('fetchEventsParticipants', error)
    return map
  }
  // resolve names from profiles via list_active_members-like approach: query profiles for those ids
  const userIds = Array.from(new Set((data ?? []).map((r: { user_id: string }) => r.user_id)))
  const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
  const nameById: Record<string, string> = {}
  for (const p of profs ?? []) {
    const nm = p.full_name || (p.email ? p.email.split('@')[0] : 'member')
    nameById[p.id] = nm
  }
  for (const r of data ?? []) {
    const eid = r.event_id as string
    if (!map[eid]) map[eid] = []
    map[eid].push(nameById[r.user_id] || 'member')
  }
  return map
}

export async function setVisibilityMembers(eventId: string, userIds: string[]): Promise<boolean> {
  const { error } = await supabase.rpc('set_visibility_members', { p_event_id: eventId, p_user_ids: userIds })
  if (error) {
    console.error('setVisibilityMembers', error)
    return false
  }
  return true
}

export async function fetchVisibilityMemberIds(eventId: string): Promise<string[]> {
  const { data, error } = await supabase.from('event_visibility_members').select('user_id').eq('event_id', eventId)
  if (error) {
    console.error('fetchVisibilityMemberIds', error)
    return []
  }
  return (data ?? []).map((r: { user_id: string }) => r.user_id)
}

/** Record a revision when an existing event is edited. Pass the pre-edit values. */
export async function addRevision(
  eventId: string,
  reason: string,
  prev: { title: string; start_time: string | null; end_time: string | null; all_day: boolean; note: string; visibility: Visibility },
): Promise<boolean> {
  const { error } = await supabase.rpc('add_revision', {
    p_event_id: eventId,
    p_reason: reason,
    p_prev_title: prev.title,
    p_prev_start_time: prev.start_time,
    p_prev_end_time: prev.end_time,
    p_prev_all_day: prev.all_day,
    p_prev_note: prev.note,
    p_prev_visibility: prev.visibility,
  })
  if (error) {
    console.error('addRevision', error)
    return false
  }
  return true
}

export async function listRevisions(eventId: string): Promise<EventRevision[]> {
  const { data, error } = await supabase.rpc('list_revisions', { p_event_id: eventId })
  if (error) {
    console.error('listRevisions', error)
    return []
  }
  return (data ?? []) as EventRevision[]
}

/** Basic list of other active members, for picking participants / specific-visibility targets. */
export async function fetchActiveMembers(): Promise<{ id: string; email: string; full_name: string; avatar_color: string | null }[]> {
  const { data, error } = await supabase.rpc('list_active_members')
  if (error) {
    console.error('fetchActiveMembers', error)
    return []
  }
  return (data ?? []) as { id: string; email: string; full_name: string; avatar_color: string | null }[]
}

/** Set current user's avatar color. */
export async function setAvatarColor(color: string): Promise<boolean> {
  const { error } = await supabase.rpc('set_avatar_color', { p_color: color })
  if (error) {
    console.error('setAvatarColor', error)
    return false
  }
  return true
}

/** Minimal display name for the user (used as owner_name on inserts). */
export function displayNameOf(email: string | undefined, userMeta: Record<string, unknown> | undefined): string {
  const name = userMeta?.full_name || userMeta?.name || userMeta?.user_name
  if (typeof name === 'string' && name) return name
  if (email) return email.split('@')[0]
  return 'member'
}
