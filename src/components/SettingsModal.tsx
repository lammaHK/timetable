import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../lib/i18n'
import { usePrefs } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'
import VisibilityPicker from './VisibilityPicker'
import type { Visibility } from '../lib/types'

function OptionPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.value} type="button" className={`seg-item ${value === o.value ? 'active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsModal({
  open,
  onClose,
  onManageMembers,
}: {
  open: boolean
  onClose: () => void
  onManageMembers: () => void
}) {
  const { t } = useI18n()
  const { theme, setTheme, lang, setLang, defaultVisibility, setDefaultVisibility } = usePrefs()
  const { user, signOut, isAdmin } = useAuth()

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
                <div className="modal-title">{t('settingsTitle')}</div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="section-label">{t('appearance')}</div>
              <div className="setting-card" style={{ padding: '6px 16px 16px' }}>
                <div className="field" style={{ marginBottom: 10, marginTop: 6 }}>
                  <div className="field-label">{t('theme')}</div>
                  <OptionPills
                    options={[
                      { value: 'light', label: t('theme_light') },
                      { value: 'dark', label: t('theme_dark') },
                      { value: 'system', label: t('theme_system') },
                    ]}
                    value={theme}
                    onChange={setTheme}
                  />
                </div>
                <div className="field">
                  <div className="field-label">{t('language')}</div>
                  <OptionPills
                    options={[
                      { value: 'zh', label: t('lang_zh') },
                      { value: 'en', label: t('lang_en') },
                    ]}
                    value={lang}
                    onChange={setLang}
                  />
                </div>
              </div>

              <div className="section-label">{t('defaults')}</div>
              <div className="setting-card" style={{ padding: '6px 16px 16px' }}>
                <div className="field" style={{ marginBottom: 2, marginTop: 6 }}>
                  <div className="field-label">{t('defaultVisibility')}</div>
                  <VisibilityPicker value={defaultVisibility} onChange={(v: Visibility) => setDefaultVisibility(v)} />
                </div>
              </div>

              <div className="section-label">{t('account')}</div>
              <div className="setting-card">
                {user ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                      <div className="avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
                        {user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.user_metadata?.full_name || user.email}
                        </div>
                        {user.email && user.user_metadata?.full_name ? (
                          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{user.email}</div>
                        ) : null}
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => signOut()}>
                        {t('signOut')}
                      </button>
                    </div>
                    {isAdmin && (
                      <div style={{ padding: '0 10px 12px' }}>
                        <button className="btn btn-ghost btn-block" onClick={onManageMembers}>
                          👥 {t('manageMembers')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                    {t('guestBanner')}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
