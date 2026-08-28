import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'forgot'

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const back = () => {
    setError('')
    setSent(false)
    setMode('signin')
  }

  const submit = async () => {
    if (!email.trim() || (!password && mode !== 'forgot')) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        onClose()
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        // autoconfirm is on → session returned immediately; close modal
        onClose()
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
        if (error) throw error
        setSent(true)
      }
    } catch (e: any) {
      setError(t(e?.message || 'signInFailed'))
    } finally {
      setBusy(false)
    }
  }

  const titles: Record<Mode, string> = {
    signin: t('signInTitle'),
    signup: t('signUpTitle'),
    forgot: t('forgotTitle'),
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-card"
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            >
              <div className="modal-head">
                <div>
                  <div className="modal-title">{titles[mode]}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>
                    {mode === 'signin' ? t('signInSubtitle') : mode === 'signup' ? t('signUpSubtitle') : t('forgotSubtitle')}
                  </div>
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {sent ? (
                <div className="banner" style={{ border: 'none', background: 'var(--accent-soft)', justifyContent: 'center', marginTop: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>📬 {t('checkEmail')}</span>
                </div>
              ) : (
                <>
                  <div className="field">
                    <div className="field-label">{t('email')}</div>
                    <input
                      className="text-input"
                      type="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoCapitalize="none"
                      autoComplete="email"
                      disabled={busy}
                    />
                  </div>

                  {mode !== 'forgot' && (
                    <div className="field">
                      <div className="field-label">{t('password')}</div>
                      <input
                        className="text-input"
                        type="password"
                        placeholder={mode === 'signup' ? t('passwordHint') : '••••••••'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        disabled={busy}
                      />
                    </div>
                  )}

                  {error && (
                    <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, background: 'var(--danger-soft)', padding: '10px 12px', borderRadius: 10 }}>
                      {error}
                    </div>
                  )}

                  <button className="btn btn-primary btn-block" onClick={submit} disabled={busy || !email.trim() || (!password && mode !== 'forgot')}>
                    {mode === 'signin' ? t('signIn') : mode === 'signup' ? t('signUp') : t('sendLink')}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16, fontSize: 13 }}>
                    {mode === 'signin' && (
                      <button className="link-btn" onClick={() => { setMode('forgot'); setError('') }}>
                        {t('forgotPassword')}
                      </button>
                    )}
                    {mode === 'signin' ? (
                      <button className="link-btn" onClick={() => { setMode('signup'); setError('') }}>
                        {t('needAccount')}
                      </button>
                    ) : (
                      <button className="link-btn" onClick={back}>
                        {t('hasAccount')}
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}