import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Dayjs } from 'dayjs'
import { X, CalendarBlank, Plus } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import { VisibilityBadge } from './VisibilityPicker'
import { formatTime } from '../lib/dates'
import { getDateInfo } from '../lib/cn'
import type { AppEvent } from '../lib/types'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_SHORT_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

export default function DaySheet({
  date,
  events,
  onClose,
  onAdd,
  onEdit,
}: {
  date: Dayjs
  events: AppEvent[]
  onClose: () => void
  onAdd: () => void
  onEdit: (e: AppEvent) => void
}) {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const isZh = lang === 'zh'
  const dateLabel = `${isZh ? MONTH_SHORT_ZH[date.month()] : MONTH_SHORT[date.month()]} ${date.date()} · ${isZh ? WD_ZH[date.day()] : WD[date.day()]}`
  const cn = getDateInfo(date.format('YYYY-MM-DD'))
  const holidayLabel = cn.holiday || cn.festival
  const sorted = [...events].sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    return (a.start_time || '99').localeCompare(b.start_time || '99')
  })

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const halfH = vh * 0.55
  const fullH = vh * 0.86
  const [level, setLevel] = useState<'half' | 'full'>('half')

  // Pure framer drag: framer animates the sheet's transform natively (GPU) while dragging,
  // so it tracks the finger instantly. We only choose the resting level on release.
  const onDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    const off = info.offset.y
    const vel = info.velocity.y
    if (off > 90 || vel > 700) {
      onClose()
      return
    }
    if (vel < -700 || off < -40) {
      setLevel('full')
    } else {
      setLevel('half')
    }
  }

  return (
    <AnimatePresence>
      <>
        <motion.div
          className="scrim"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
        <motion.div
          className="sheet"
          style={{ height: level === 'full' ? fullH : halfH }}
          initial={{ y: vh, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: vh, transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.2, bottom: 0.5 }}
          dragTransition={{ power: 0.2, timeConstant: 150, restDelta: 1 }}
          onDragEnd={onDragEnd}
        >
          <div className="sheet-grab" onClick={() => setLevel((l) => (l === 'full' ? 'half' : 'full'))} />
          <div className="sheet-head">
            <div>
              <div className="month-title" style={{ fontSize: 19 }}>{dateLabel}</div>
              {holidayLabel && (
                <div className="sheet-holiday">{holidayLabel}</div>
              )}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
              <X size={20} />
            </button>
          </div>

          <div className="sheet-body">
              {!user && (
                <div className="banner">
                  <div className="banner-icon">
                    <CalendarBlank size={18} weight="duotone" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t('guestBanner')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t('signInToEdit')}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={onAdd}>
                    {t('signIn')}
                  </button>
                </div>
              )}

              {sorted.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <CalendarBlank size={34} weight="thin" />
                  </div>
                  <div style={{ fontWeight: 700 }}>{t('noEvents')}</div>
                  {user ? (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={onAdd}>
                      <Plus size={16} weight="bold" /> {t('addEvent')}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="events-list">
                  {sorted.map((e) => {
                    const mine = user && e.owner_id === user.id
                    return (
                      <div key={e.id} className="event-row pressable" onClick={() => onEdit(e)}>
                        <div className="event-time">
                          {e.all_day ? t('allDay') : `${e.start_time ? formatTime(e.start_time) : '--'}${e.end_time ? ' - ' + formatTime(e.end_time) : ''}`}
                        </div>
                        <div className="event-title">{e.title}</div>
                        {e.note && <div className="event-note">{e.note}</div>}
                        <div className="event-meta">
                          <VisibilityBadge v={e.visibility} />
                          {!mine && e.owner_name && <span className="event-owner">· {e.owner_name}</span>}
                        </div>
                      </div>
                    )
                  })}
                  <div className="events-add">
                    <button className="btn btn-ghost btn-sm" onClick={onAdd}>
                      <Plus size={16} weight="bold" /> {t('addEvent')}
                    </button>
                  </div>
                </div>
              )}
            </div>
        </motion.div>
      </>
    </AnimatePresence>
  )
}