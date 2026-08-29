import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import type { Dayjs } from 'dayjs'
import { X, CalendarBlank, Plus } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import { VisibilityBadge } from './VisibilityPicker'
import { fetchEventsParticipants } from '../lib/data'
import { formatTime } from '../lib/dates'
import { getDateInfo } from '../lib/cn'
import type { AppEvent } from '../lib/types'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_SHORT_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_ZH = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

type Level = 'half' | 'full'

export default function DaySheet({
  open,
  date,
  events,
  onClose,
  onAdd,
  onEdit,
}: {
  open: boolean
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

  const [partByEvent, setPartByEvent] = useState<Record<string, string[]>>({})
  useEffect(() => {
    const ids = events.map((e) => e.id)
    fetchEventsParticipants(ids).then((m) => setPartByEvent(m))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.map((e) => e.id).join(',')])

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const halfH = vh * 0.55
  const fullH = vh * 0.86
  const [level, setLevel] = useState<Level>('half')

  // Manual drag: we track touch/pointer on the grab+head handle with a motion value.
  // This is reliable on iOS Safari (framer's drag on fixed elements can be flaky there).
  const y = useMotionValue(0)
  const springY = useSpring(y, { stiffness: 400, damping: 40 })
  const dragStart = useRef<{ y: number; pointer: number } | null>(null)
  const velocity = useRef(0)

  const onDown = (e: RPointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragStart.current = { y: y.get(), pointer: e.clientY }
    velocity.current = 0
  }
  const onMove = (e: RPointerEvent) => {
    if (!dragStart.current) return
    const dy = e.clientY - dragStart.current.pointer
    // clamp so it can't go above fully-open (never positive opening beyond top)
    const next = Math.max(0, dy)
    y.set(next)
    velocity.current = dy
  }
  const onUp = () => {
    if (!dragStart.current) return
    const off = y.get()
    const vel = velocity.current
    dragStart.current = null
    // snap
    if (off > 90 || vel > 120) {
      onClose()
      return
    }
    if (vel < -120) {
      setLevel('full')
    } else if (off > 40) {
      setLevel('half')
    } else {
      setLevel('half')
    }
    y.set(0) // spring back to resting
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-scrim"
            className="scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
          />
          <motion.div
            key="sheet"
            className="sheet"
            style={{ height: level === 'full' ? fullH : halfH, y: springY }}
            initial={{ y: vh, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 32 } }}
            exit={{ y: vh, opacity: 0, transition: { duration: 0.26, ease: [0.32, 0.72, 0, 1] } }}
          >
            <div
              className="sheet-drag"
              style={{ touchAction: 'none' }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <div className="sheet-grab" onClick={() => setLevel((l) => (l === 'full' ? 'half' : 'full'))} />
              <div className="sheet-head">
                <div>
                  <div className="month-title" style={{ fontSize: 19 }}>{dateLabel}</div>
                  {holidayLabel && <div className="sheet-holiday">{holidayLabel}</div>}
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <X size={20} />
                </button>
              </div>
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
                          <span className="event-time-inline">{e.all_day ? t('allDay') : `${e.start_time ? formatTime(e.start_time) : '--'}${e.end_time ? ' - ' + formatTime(e.end_time) : ''}`}</span>
                          {partByEvent[e.id] && partByEvent[e.id].length > 0 && (
                            <span className="event-owner">· {partByEvent[e.id].join(', ')}</span>
                          )}
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
      )}
    </AnimatePresence>
  )
}