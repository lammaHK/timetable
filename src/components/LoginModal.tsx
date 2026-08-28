import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

// Convert a username to the hidden email used by Supabase auth.
// Usernames are case-insensitive and unique.
function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@timetable.local`
}

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fff]{2,24}$/

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const swapMode = () => {
    setError('')
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
  }

  const submit = async () => {
    const uname = username.trim()
    if (!uname || !USERNAME_RE.test(uname)) {
      setError(t('usernameInvalid'))
      return
    }
    if (!password) return
    setBusy(true)
    setError('')
    const email = usernameToEmail(uname)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: uname, full_name: uname } },
        })
        if (error) throw error
        // autoconfirm is on → session returned immediately
        onClose()
      }
    } catch (e: any) {
      const msg = e?.message || ''
      setError(msg.includes('already') || msg.includes('registered') ? t('usernameTaken') : t('signInFailed'))
    } finally {
      setBusy(false)
    }
  }

  const isSignin = mode === 'signin'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="modal" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            >
              <div className="modal-head">
                <div>
                  <div className="modal-title">{isSignin ? t('signInTitle') : t('signUpTitle')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>
                    {isSignin ? t('signInSubtitle') : t('signUpSubtitle')}
                  </div>
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <X size={20} />
                </button>
              </div>

              <div className="field">
                <div className="field-label">{t('username')}</div>
                <input
                  className="text-input"
                  placeholder={t('usernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  disabled={busy}
                />
              </div>

              <div className="field">
                <div className="field-label">{t('password')}</div>
                <input
                  className="text-input"
                  type="password"
                  placeholder={!isSignin ? t('passwordHint') : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignin ? 'current-password' : 'new-password'}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  disabled={busy}
                />
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, background: 'var(--danger-soft)', padding: '10px 12px', borderRadius: 10 }}>
                  {error}
                </div>
              )}

              <button className="btn btn-primary btn-block" onClick={submit} disabled={busy || !username.trim() || !password}>
                {isSignin ? t('signIn') : t('signUp')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, fontSize: 13 }}>
                <button className="link-btn" onClick={swapMode}>
                  {isSignin ? t('needAccount') : t('hasAccount')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}