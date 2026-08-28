import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { isBackendConfigured } from '../lib/config'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Visibility } from '../lib/types'

type ThemePref = 'light' | 'dark' | 'system'
type Lang = 'en' | 'zh'

interface PrefCtx {
  theme: ThemePref
  lang: Lang
  defaultVisibility: Visibility
  setTheme: (t: ThemePref) => void
  setLang: (l: Lang) => void
  setDefaultVisibility: (v: Visibility) => void
  ready: boolean
}

const PrefContext = createContext<PrefCtx>({
  theme: 'system',
  lang: 'zh',
  defaultVisibility: 'members',
  setTheme: () => {},
  setLang: () => {},
  setDefaultVisibility: () => {},
  ready: false,
})

function systemTheme(): ThemePref {
  return 'system'
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<ThemePref>(() => (localStorage.getItem('tt.theme') as ThemePref) || 'system')
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('tt.lang') as Lang) || 'zh')
  const [defaultVisibility, setDefaultVisibilityState] = useState<Visibility>(() => (localStorage.getItem('tt.defvis') as Visibility) || 'members')
  const [ready, setReady] = useState(false)

  // Apply effective theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const eff = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
      document.documentElement.setAttribute('data-theme', eff)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  // Persist theme/lang locally
  useEffect(() => {
    localStorage.setItem('tt.theme', theme)
  }, [theme])
  useEffect(() => {
    localStorage.setItem('tt.lang', lang)
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-Hant' : 'en')
  }, [lang])
  useEffect(() => {
    localStorage.setItem('tt.defvis', defaultVisibility)
  }, [defaultVisibility])

  // Load/sync settings from backend for signed-in users
  useEffect(() => {
    if (!user || !isBackendConfigured) {
      setReady(true)
      return
    }
    let cancelled = false
    const load = async () => {
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle()
      if (cancelled || !data) {
        setReady(true)
        return
      }
      if (data.theme) setThemeState(data.theme)
      if (data.lang) setLangState(data.lang)
      if (data.default_visibility) setDefaultVisibilityState(data.default_visibility)
      setReady(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const effectPrefs = { theme, lang, defaultVisibility }
  // Push cross-device prefs to backend (best effort)
  useEffect(() => {
    if (!user || !isBackendConfigured) return
    const debounce = setTimeout(async () => {
      await supabase.from('user_settings').upsert(
        { user_id: user.id, theme, lang, default_visibility: defaultVisibility },
        { onConflict: 'user_id' },
      )
    }, 400)
    return () => clearTimeout(debounce)
  }, [user, effectPrefs])

  const value: PrefCtx = {
    theme,
    lang,
    defaultVisibility,
    setTheme: (t) => setThemeState(t),
    setLang: (l) => setLangState(l),
    setDefaultVisibility: (v) => setDefaultVisibilityState(v),
    ready,
  }

  return <PrefContext.Provider value={value}>{children}</PrefContext.Provider>
}

export const usePrefs = () => useContext(PrefContext)
export const systemThemePref = systemTheme
