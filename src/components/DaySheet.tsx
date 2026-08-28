import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Dayjs } from 'dayjs'
import { X, CalendarBlank, Plus } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import { VisibilityBadge } from './VisibilityPicker'
import { formatTime } from '../lib/dates'
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
  const sorted = [...events].sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    return (a.start_time || '99').localeCompare(b.start_time || '99')
  })

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const peekH = vh * 0.22 // barely showing the header
  const halfH = vh * 0.55
  const fullH = vh * 0.86

  // Sheet height driven by dragging: drag down shrinks (toward peek/hide), drag up grows (toward full).
  const [h, setH] = useState(halfH)
  const [dragging, setDragging] = useState(false)
  const baseH = useRef(halfH)

  const onDrag = (_: unknown, info: { delta: { y: number } }) => {
    // dragging down (delta.y>0) subtracts height; up adds
    baseH.current = Math.min(fullH, Math.max(peekH, baseH.current - info.delta.y * 1.1))
    setH(baseH.current)
  }
  const onDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    baseH.current = halfH
    const vel = info.velocity.y
    const mid = (halfH + peekH) / 2
    if (vel > 900 || info.offset.y > vh * 0.4) {
      onClose()
      return
    }
    // snap: is current height closer to full, half, or closing?
    const cur = h
    if (vel < -500 || cur > (halfH + fullH) / 2) {
      setH(fullH)
    } else if (cur < mid) {
      // near bottom → if below peek threshold, dismiss, else go half
      if (cur < peekH + 40) onClose()
      else setH(halfH)
    } else {
      setH(halfH)
    }
  }

  const grabTap = () => setH((p) => (p > halfH + 40 ? halfH : fullH))

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
          initial={{ height: 0 }}
          animate={{ height: dragging ? h : h }}
          exit={{ height: 0, transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } }}
          transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          style={{ touchAction: 'none' }}
        >
          <motion.div
            className="sheet-drag"
            drag="y"
            onDragStart={() => setDragging(true)}
            onDrag={onDrag}
            onDragEnd={(e, info) => {
              setDragging(false)
              onDragEnd(e, info)
            }}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0 }}
            dragMomentum={false}
            style={{ touchAction: 'none' }}
          >
            <div className="sheet-grab" onClick={grabTap} />
            <div className="sheet-head">
              <div className="month-title" style={{ fontSize: 19 }}>{dateLabel}</div>
              <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                <X size={20} />
              </button>
            </div>
          </motion.div>

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