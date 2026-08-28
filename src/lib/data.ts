import { supabase } from '../lib/supabase'
import { isBackendConfigured } from '../lib/config'
import type { AppEvent, EventPreset, Profile, UserSettings, Visibility } from '../lib/types'

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
}

export async function createEvent(input: EventInput): Promise<AppEvent | null> {
  const { data, error } = await supabase.from('events').insert(input).select().single()
  if (error) {
    console.error('createEvent', error)
    return null
  }
  return data as AppEvent
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

/** Minimal display name for the user (used as owner_name on inserts). */
export function displayNameOf(email: string | undefined, userMeta: Record<string, unknown> | undefined): string {
  const name = userMeta?.full_name || userMeta?.name || userMeta?.user_name
  if (typeof name === 'string' && name) return name
  if (email) return email.split('@')[0]
  return 'member'
}
