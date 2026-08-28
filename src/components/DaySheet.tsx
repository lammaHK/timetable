import { useEffect } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import type { Dayjs } from 'dayjs'
import { X, CalendarBlank, Plus, CaretUp } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import { VisibilityBadge } from './VisibilityPicker'
import { formatTime } from '../lib/dates'
import type { AppEvent } from '../lib/types'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_SHORT_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

// Snap heights (as % of viewport) for the bottom sheet.
const SNAP = {
  peek: 18, // barely showing the header
  half: 55, // half view
  full: 92, // nearly full
}

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
  const sorted = [...events].sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    return (a.start_time || '99').localeCompare(b.start_time || '99')
  })

  // Bottom sheet snap: y offset in px. 0 = fully down (hidden), negative moves up.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const y = useMotionValue(0)
  const springY = useSpring(y, { stiffness: 260, damping: 30 })

  const heights = {
    full: -(vh * (SNAP.full / 100)),
    half: -(vh * (SNAP.half / 100)),
    peek: -(vh * (SNAP.peek / 100)),
  }

  const liftTo = (target: 'full' | 'half' | 'peek' | 'closed') => {
    if (target === 'closed') {
      onClose()
      return
    }
    y.set(heights[target])
  }

  // On mount, lift to half height.
  useEffect(() => {
    y.set(heights.half)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    const pull = info.offset.y // positive = dragged down
    const vel = info.velocity.y
    if (pull > 90 || vel > 900) {
      onClose()
      return
    }
    if (vel < -900 || pull < -90) {
      liftTo('full')
      return
    }
    // default back to half
    liftTo('half')
  }

  return (
    <AnimatePresence>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="sheet"
        style={{ y: springY }}
        initial={{ y: vh }}
        animate={{ y: heights.half }}
        exit={{ y: vh }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: heights.full, bottom: 0 }}
        dragElastic={{ top: 0.1, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
      >
        <div className="sheet-grab" />
        <div className="sheet-head">
          <div className="sheet-snaps">
            <button className="sheet-snap-btn" onClick={() => liftTo('half')} aria-label={t('half')}>
              <CaretUp size={12} />
            </button>
            <button className="sheet-snap-btn" onClick={() => liftTo('full')} aria-label={t('full')}>
              <CaretUp size={12} />
            </button>
          </div>
          <div className="month-title" style={{ fontSize: 19, flex: 1 }}>{dateLabel}</div>
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
              <div style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>{t('noEventsHint')}</div>
              {user && (
                <button className="btn btn-primary btn-sm" onClick={onAdd}>
                  <Plus size={16} weight="bold" /> {t('addEvent')}
                </button>
              )}
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
    </AnimatePresence>
  )
}