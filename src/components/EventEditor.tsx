import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Dayjs } from 'dayjs'
import { useI18n } from '../lib/i18n'
import VisibilityPicker from './VisibilityPicker'
import type { AppEvent, Visibility } from '../lib/types'

interface EditorProps {
  open: boolean
  date: Dayjs | null
  event: AppEvent | null
  defaultVisibility: Visibility
  onClose: () => void
  onSave: (v: { id?: string; title: string; start_time: string | null; end_time: string | null; all_day: boolean; note: string; visibility: Visibility }) => void
  onDelete?: (id: string) => void
}

export default function EventEditor({ open, date, event, defaultVisibility, onClose, onSave, onDelete }: EditorProps) {
  const { t } = useI18n()
  const isEdit = Boolean(event)

  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility)

  // Initialize fields whenever the modal opens (add or edit)
  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? '')
      setAllDay(event?.all_day ?? false)
      setStartTime(event?.start_time ? event.start_time.slice(0, 5) : '')
      setEndTime(event?.end_time ? event.end_time.slice(0, 5) : '')
      setNote(event?.note ?? '')
      setVisibility(event?.visibility ?? defaultVisibility)
    }
  }, [open, event, defaultVisibility])

  const submit = () => {
    if (!title.trim()) return
    onSave({
      id: event?.id,
      title: title.trim(),
      start_time: allDay || !startTime ? null : startTime,
      end_time: allDay || !endTime ? null : endTime,
      all_day: allDay,
      note: note.trim(),
      visibility,
    })
  }

  const dateLabel = date ? date.format('YYYY-MM-DD') : ''

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-card"
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            >
              <div className="modal-head">
                <div>
                  <div className="modal-title">{isEdit ? t('editEvent') : t('addEvent')}</div>
                  {dateLabel && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{dateLabel}</div>
                  )}
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="field">
                <div className="field-label">{t('title')}</div>
                <input
                  className="text-input"
                  placeholder={!isEdit ? t('title') : ''}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  enterKeyHint="done"
                />
              </div>

              <div className="switch-row">
                <div className="switch-label">{t('allDay')}</div>
                <button type="button" className={`switch ${allDay ? 'on' : ''}`} onClick={() => setAllDay((v) => !v)} aria-pressed={allDay} />
              </div>

              {!allDay && (
                <div className="field">
                  <div className="time-row">
                    <div>
                      <div className="field-label">{t('startTime')}</div>
                      <input type="time" className="time-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                    <div>
                      <div className="field-label">{t('endTime')}</div>
                      <input type="time" className="time-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="field">
                <div className="field-label">{t('note')}</div>
                <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="" />
              </div>

              <div className="field">
                <div className="field-label">{t('visibility')}</div>
                <VisibilityPicker value={visibility} onChange={setVisibility} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {isEdit && onDelete && (
                  <button className="btn btn-danger" onClick={() => onDelete(event!.id)} style={{ flex: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                )}
                <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                  {t('cancel')}
                </button>
                <button className="btn btn-primary" onClick={submit} disabled={!title.trim()} style={{ flex: 1, opacity: title.trim() ? 1 : 0.5 }}>
                  {t('save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
