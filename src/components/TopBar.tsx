import { motion } from 'framer-motion'
import { Clock, Sun, Moon, GearSix } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { usePrefs } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

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
  const uname = (user?.user_metadata?.username as string) || (user?.email && !user.email.endsWith('@timetable.local') ? user.email.split('@')[0] : '')
  const initial = uname?.[0]?.toUpperCase() || '?'

  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo-mark">
          <Clock size={20} weight="bold" />
        </span>
        <span>{t('appName')}</span>
      </div>
      <div className="topbar-spacer" />
      <button className="icon-btn" onClick={toggleLang} title={lang === 'zh' ? 'EN' : '繁中'} aria-label="language">
        <span style={{ fontSize: 13, fontWeight: 800 }}>{lang === 'zh' ? 'EN' : '繁中'}</span>
      </button>
      <button className="icon-btn" onClick={toggleTheme} title="Theme" aria-label="theme">
        {effDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <button className="icon-btn" onClick={onOpenSettings} title={t('settings')} aria-label={t('settings')}>
        <GearSix size={20} />
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