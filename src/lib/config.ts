// Public-safe config. Supabase URL + anon key are meant to be public (anon key is RLS-restricted).
// Values come from Vite env (see .env). The app degrades gracefully if not yet configured.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || ''
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

export const isBackendConfigured =
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && SUPABASE_URL.startsWith('http')

export const APP_NAME = 'TimeTable'

/** GitHub Pages site base — used so asset URLs work under /<repo>/ */
export const BASE_URL = import.meta.env.BASE_URL || '/'
