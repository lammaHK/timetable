import { supabase } from '../lib/supabase'
import { isBackendConfigured } from '../lib/config'
import type { AppEvent, UserSettings, Visibility } from '../lib/types'

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

/** Minimal display name for the user (used as owner_name on inserts). */
export function displayNameOf(email: string | undefined, userMeta: Record<string, unknown> | undefined): string {
  const name = userMeta?.full_name || userMeta?.name || userMeta?.user_name
  if (typeof name === 'string' && name) return name
  if (email) return email.split('@')[0]
  return 'member'
}
