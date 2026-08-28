import { useState } from 'react'
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

  // Height in px (0 = closed). Always pinned to viewport bottom.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const halfH = vh * 0.5
  const fullH = vh * 0.86 // keep within .sheet max-height
  const [full, setFull] = useState(false)

  return (
    <AnimatePresence>
      <>
        <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div
          className="sheet"
          initial={{ y: window.innerHeight }}
          animate={{ y: 0 }}
          exit={{ y: window.innerHeight }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.8 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 500) onClose()
            else if (info.velocity.y < -400 || info.offset.y < -60) setFull(true)
          }}
          style={{ height: full ? fullH : halfH }}
        >
            <div className="sheet-grab" onClick={() => setFull((f) => !f)} />
            <div className="sheet-head">
              <div className="month-title" style={{ fontSize: 19 }}>{dateLabel}</div>
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
        </>
    </AnimatePresence>
  )
}