import { motion } from 'framer-motion'
import { CalendarCheck } from '@phosphor-icons/react'
import type { Dayjs } from 'dayjs'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import { VisibilityBadge } from './VisibilityPicker'
import { formatTime } from '../lib/dates'
import type { AppEvent } from '../lib/types'

export default function TodaySection({
  today,
  events,
  onOpenDay,
}: {
  today: Dayjs
  events: AppEvent[]
  onOpenDay: (d: Dayjs) => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()

  const todayStr = today.format('YYYY-MM-DD')
  // events already filtered by RLS; just grab today's
  const todays = events.filter((e) => e.date === todayStr)
  const sorted = [...todays].sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    return (a.start_time || '99').localeCompare(b.start_time || '99')
  })

  return (
    <motion.div
      className="today-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
    >
      <button className="today-head" onClick={() => onOpenDay(today)}>
        <span className="today-head-icon">
          <CalendarCheck size={18} weight="duotone" />
        </span>
        <span className="today-title">{t('todaySchedule')}</span>
        <span className="today-count">{sorted.length}</span>
        <svg className="today-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {sorted.length === 0 ? (
        <div className="today-empty">
          <span>{t('noEventsToday')}</span>
          {user ? null : <span className="today-hint">{t('signInToEdit')}</span>}
        </div>
      ) : (
        <div className="today-list">
          {sorted.slice(0, 4).map((e) => (
            <button key={e.id} className="today-row pressable" onClick={() => onOpenDay(today)}>
              <div className="today-row-time">
                {e.all_day ? t('allDay') : formatTime(e.start_time) || '--'}
              </div>
              <div className="today-row-title">{e.title}</div>
              <VisibilityBadge v={e.visibility} />
            </button>
          ))}
          {sorted.length > 4 && (
            <div className="today-more">{t('moreEvents')}</div>
          )}
        </div>
      )}
    </motion.div>
  )
}