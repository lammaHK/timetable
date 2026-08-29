import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import dayjs, { Dayjs } from 'dayjs'
import { X, CalendarBlank, Clock } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { fetchEventsParticipants } from '../lib/data'
import { formatTime } from '../lib/dates'
import { VisibilityBadge } from './VisibilityPicker'
import type { AppEvent } from '../lib/types'

export default function EventDetailSheet({
  open,
  event,
  onClose,
  onViewDay,
}: {
  open: boolean
  event: AppEvent | null
  onClose: () => void
  onViewDay: (d: Dayjs) => void
}) {
  const { t } = useI18n()
  const [parts, setParts] = useState<string[]>([])

  useEffect(() => {
    if (open && event) {
      fetchEventsParticipants([event.id]).then((m) => setParts(m[event.id] || []))
    }
  }, [open, event?.id])

  if (!event) return null
  const timeLabel = event.all_day
    ? t('allDay')
    : `${event.start_time ? formatTime(event.start_time) : '--'}${event.end_time ? ' - ' + formatTime(event.end_time) : ''}`
  const ownerLabel = event.owner_name || 'owner'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} />
          <motion.div className="modal" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', damping: 28, stiffness: 340 } }}
              exit={{ y: 28, opacity: 0, scale: 0.985, transition: { duration: 0.22, ease: 'easeOut' } }}
            >
              <div className="modal-head">
                <div className="modal-title-row">
                  <div className="modal-title">{event.title}</div>
                  <VisibilityBadge v={event.visibility} />
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <X size={20} />
                </button>
              </div>

              <div className="detail-time">
                <Clock size={16} weight="duotone" />
                <span>{timeLabel}</span>
              </div>

              {event.note && <div className="detail-note">{event.note}</div>}

              {/* Owner with creator label */}
              <div className="detail-owner">
                <div className="owner-row">
                  <span className="owner-avatar">{ownerLabel[0]?.toUpperCase()}</span>
                  <div>
                    <div className="owner-name">{ownerLabel}</div>
                    <div className="owner-tag">{t('owner')}</div>
                  </div>
                </div>
              </div>

              {/* Participants as avatar stack */}
              {parts.length > 0 && (
                <div className="detail-parts">
                  <div className="detail-section-label">{t('participants')}</div>
                  <div className="detail-avatars">
                    {parts.map((nm, i) => (
                      <span key={i} className="detail-avatar" title={nm}>{nm[0]?.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="editor-actions">
                <button className="btn btn-ghost" onClick={onClose}>
                  {t('close')}
                </button>
                <button className="btn btn-primary" onClick={() => onViewDay(dayjs(event.date))}>
                  <CalendarBlank size={16} weight="duotone" /> {t('viewDaySchedule')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}