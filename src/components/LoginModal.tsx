import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const google = async () => {
    setBusy(true)
    await supabase.auth.signInWithOAuth({ provider: 'google' })
    // redirect handled by supabase; keep busy off on return
    setBusy(false)
  }

  const emailLink = async () => {
    if (!email.trim()) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setBusy(false)
    if (!error) setSent(true)
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
                  <div className="modal-title">{t('signInTitle')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{t('signInSubtitle')}</div>
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <button className="btn btn-ghost btn-block" onClick={google} disabled={busy} style={{ marginBottom: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
                </svg>
                {t('signInWithGoogle')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {sent ? (
                <div className="banner" style={{ border: 'none', background: 'var(--accent-soft)', justifyContent: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>📬 {t('checkEmail')}</span>
                </div>
              ) : (
                <>
                  <div className="field-label" style={{ marginBottom: 7 }}>{t('email')}</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      className="text-input"
                      type="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoCapitalize="none"
                    />
                    <button className="btn btn-primary" onClick={emailLink} disabled={busy || !email.trim()}>
                      {t('sendLink')}
                    </button>
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
