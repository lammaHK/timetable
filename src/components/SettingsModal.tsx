import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Users, X, Check } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { usePrefs } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'
import { setAvatarColor } from '../lib/data'
import VisibilityPicker from './VisibilityPicker'
import type { Visibility } from '../lib/types'

const AVATAR_COLORS = ['#2fd6bd', '#4a7de0', '#e07b39', '#ff6b81', '#b48fff', '#e0c341', '#7aa87f', '#82868f']

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
  const { user, signOut, isAdmin, refreshProfile } = useAuth()
  const displayName = (user?.user_metadata?.username as string) || user?.user_metadata?.full_name || (user?.email && !user.email.endsWith('@timetable.local') ? user.email.split('@')[0] : '') || ''
  const avatarChar = displayName?.[0]?.toUpperCase() || '?'
  const showRawEmail = user?.email && !user.email.endsWith('@timetable.local')
  const [avColor, setAvColor] = useState<string | null>((user?.user_metadata?.avatar_color as string) || null)
  const pickColor = async (c: string) => {
    setAvColor(c)
    await setAvatarColor(c)
    await refreshProfile()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
          <motion.div className="modal" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', damping: 28, stiffness: 340 } }}
              exit={{ y: 28, opacity: 0, scale: 0.985, transition: { duration: 0.22, ease: 'easeOut' } }}
            >
              <div className="modal-head">
                <div className="modal-title">{t('settingsTitle')}</div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <X size={20} />
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
                      <div className="avatar" style={{ width: 44, height: 44, fontSize: 18, background: avColor || undefined }}>
                        {avatarChar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                        </div>
                        {showRawEmail && (
                          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{user.email}</div>
                        )}
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => signOut()}>
                        {t('signOut')}
                      </button>
                    </div>
                    <div style={{ padding: '0 16px 14px' }}>
                      <div className="field-label">{t('avatarColor')}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {AVATAR_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`color-swatch ${avColor === c ? 'active' : ''}`}
                            style={{ background: c }}
                            onClick={() => pickColor(c)}
                            aria-label={c}
                          >
                            {avColor === c && <Check size={14} weight="bold" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={{ padding: '0 10px 12px' }}>
                        <button className="btn btn-ghost btn-block" onClick={onManageMembers}>
                          <Users size={18} /> {t('manageMembers')}
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
