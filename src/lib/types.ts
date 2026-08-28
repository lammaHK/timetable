export type Visibility = 'private' | 'members' | 'public'

export interface AppEvent {
  id: string
  owner_id: string
  owner_name?: string | null
  date: string // YYYY-MM-DD
  start_time: string | null // HH:mm
  end_time: string | null
  all_day: boolean
  title: string
  note: string | null
  visibility: Visibility
  sort_order: number
  preset_id?: string | null
  created_at: string
}

export interface EventPreset {
  id: string
  created_by: string
  title: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  note: string | null
  visibility: Visibility
  color: string | null
  sort_order: number
  created_at: string
}

export interface UserSettings {
  user_id: string
  default_visibility: Visibility
  theme: 'light' | 'dark' | 'system'
  lang: 'en' | 'zh'
  week_starts_on: 'mon' | 'sun'
  updated_at: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: 'member' | 'admin'
  is_active: boolean
  created_at: string
}

export const VISIBILITY_ORDER: Visibility[] = ['public', 'members', 'private']
