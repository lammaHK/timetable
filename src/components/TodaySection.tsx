import { motion } from 'framer-motion'
import { CalendarCheck, Plus } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { Dayjs } from 'dayjs'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import { VisibilityBadge } from './VisibilityPicker'
import { getDateInfo } from '../lib/cn'
import { fetchEventsParticipants } from '../lib/data'
import { formatTime } from '../lib/dates'
import type { AppEvent } from '../lib/types'

export default function DayCard({
  date,
  events,
  onOpenDay,
  onOpenEvent,
  onAdd,
}: {
  date: Dayjs
  events: AppEvent[]
  onOpenDay: (d: Dayjs) => void
  onOpenEvent: (e: AppEvent) => void
  onAdd: (d: Dayjs) => void
}) {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const WEEK_ZH = ['日', '一', '二', '三', '四', '五', '六']
  const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekdayLabel = (d: Dayjs) => (lang === 'zh' ? `週${WEEK_ZH[d.day()]}` : WEEK_EN[d.day()])
  const monthZh = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const monthEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const dateStr = date.format('YYYY-MM-DD')
  const isToday = dateStr === dayjsToday()
  const cn = getDateInfo(dateStr)
  const todays = events.filter((e) => e.date === dateStr)
  const sorted = [...todays].sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    return (a.start_time || '99').localeCompare(b.start_time || '99')
  })
  const title = `${lang === 'zh' ? monthZh[date.month()] : monthEn[date.month()]} ${date.date()} · ${weekdayLabel(date)}`

  // participant names per event (for avatars)
  const [partByEvent, setPartByEvent] = useState<Record<string, string[]>>({})
  useEffect(() => {
    const ids = events.filter((e) => e.date === dateStr).map((e) => e.id)
    fetchEventsParticipants(ids).then((m) => setPartByEvent(m))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, events.length])

  return (
    <motion.div
      className="today-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
    >
      <div className="today-head">
        <button className="today-head-main" onClick={() => onOpenDay(date)}>
          <span className="today-head-icon">
            <CalendarCheck size={18} weight="duotone" />
          </span>
          <span className="today-title">
            {title}
            <span className="today-lunar"> {cn.holiday || cn.festival || cn.lunarFull}</span>
          </span>
          <span className="today-count">{sorted.length}</span>
          <svg className="today-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        {user && (
          <button className="today-add" onClick={() => onAdd(date)} aria-label={t('addEvent')} title={t('addEvent')}>
            <Plus size={18} weight="bold" />
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="today-empty">
          <span>{isToday ? t('noEventsToday') : t('noEventsThatDay')}</span>
          {user ? null : <span className="today-hint">{t('signInToEdit')}</span>}
        </div>
      ) : (
        <div className="today-list">
          {sorted.slice(0, 4).map((e) => {
            const parts = partByEvent[e.id] || []
            const timeLabel = e.all_day
              ? t('allDay')
              : `${e.start_time ? formatTime(e.start_time) : '--'}${e.end_time ? ' - ' + formatTime(e.end_time) : ''}`
            return (
              <button key={e.id} className="today-row pressable" onClick={() => onOpenEvent(e)}>
                <div className="today-row-main">
                  <div className="today-row-title">{e.title}</div>
                  <div className="today-row-time">{timeLabel}</div>
                </div>
                <div className="today-row-right">
                  {parts.length > 0 && (
                    <div className="today-avatars">
                      {parts.slice(0, 3).map((nm, i) => (
                        <span key={i} className="today-avatar" title={nm}>{nm[0]?.toUpperCase()}</span>
                      ))}
                      {parts.length > 3 && <span className="today-avatar-more">+{parts.length - 3}</span>}
                    </div>
                  )}
                  <VisibilityBadge v={e.visibility} />
                </div>
              </button>
            )
          })}
          {sorted.length > 4 && (
            <div className="today-more">{t('moreEvents')}</div>
          )}
        </div>
      )}
    </motion.div>
  )
}

function dayjsToday() {
  return new Date().toLocaleDateString('sv-SE')
}