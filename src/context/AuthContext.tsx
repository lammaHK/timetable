import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { fetchProfile } from '../lib/data'
import type { Profile } from '../lib/types'

interface AuthCtx {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  /** true while we're resolving the persisted session (show a loader) */
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load profile whenever the user id changes
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchProfile(uid).then((p) => {
      if (cancelled) return
      setProfile(p)
      setLoading(false)
      // Deactivated (non-admin) member: sign them out so they can't browse.
      if (p && p.is_active === false && p.role !== 'admin') {
        setProfile(null)
        supabase.auth.signOut()
      }
    })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)