import { motion } from 'framer-motion'
import { useI18n } from '../lib/i18n'
import { usePrefs } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dark ? (
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </>
      )}
    </svg>
  )
}

export default function TopBar({
  onOpenSettings,
  onOpenLogin,
}: {
  onOpenSettings: () => void
  onOpenLogin: () => void
}) {
  const { t } = useI18n()
  const { theme, setTheme, lang, setLang } = usePrefs()
  const { user } = useAuth()
  const effDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const toggleTheme = () => setTheme(effDark ? 'light' : 'dark')
  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh')
  const initial = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark">⏱</span>
        <span>{t('appName')}</span>
      </div>
      <div className="topbar-spacer" />
      <button className="icon-btn" onClick={toggleLang} title={lang === 'zh' ? 'EN' : '繁中'} aria-label="language">
        <span style={{ fontSize: 13, fontWeight: 800 }}>{lang === 'zh' ? 'EN' : '繁中'}</span>
      </button>
      <button className="icon-btn" onClick={toggleTheme} title="Theme" aria-label="theme">
        <ThemeIcon dark={effDark} />
      </button>
      <button className="icon-btn" onClick={onOpenSettings} title={t('settings')} aria-label={t('settings')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <motion.button
        className="avatar"
        whileTap={{ scale: 0.9 }}
        onClick={user ? onOpenSettings : onOpenLogin}
        title={user ? user.email || t('settings') : t('signIn')}
        aria-label={user ? (user.email || '') : t('signIn')}
        style={{ cursor: 'pointer' }}
      >
        {initial}
      </motion.button>
    </header>
  )
}
