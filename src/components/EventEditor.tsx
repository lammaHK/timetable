import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Trash, SquaresFour } from '@phosphor-icons/react'
import type { Dayjs } from 'dayjs'
import { useI18n } from '../lib/i18n'
import VisibilityPicker from './VisibilityPicker'
import type { AppEvent, EventPreset, Visibility } from '../lib/types'

interface EditorProps {
  open: boolean
  date: Dayjs | null
  event: AppEvent | null
  presets: EventPreset[]
  isAdmin: boolean
  defaultVisibility: Visibility
  onClose: () => void
  onSave: (v: { id?: string; title: string; start_time: string | null; end_time: string | null; all_day: boolean; note: string; visibility: Visibility; preset_id?: string | null }) => void
  onDelete?: (id: string) => void
  onManagePresets: () => void
}

export default function EventEditor({
  open,
  date,
  event,
  presets,
  isAdmin,
  defaultVisibility,
  onClose,
  onSave,
  onDelete,
  onManagePresets,
}: EditorProps) {
  const { t } = useI18n()
  const isEdit = Boolean(event)

  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility)
  const [presetId, setPresetId] = useState<string | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)

  // Compute end-time validation live (req 6): end must be > start by at least 1 min when timed.
  useEffect(() => {
    if (!allDay && startTime && endTime) {
      const toMin = (s: string) => {
        const [h, m] = s.split(':').map(Number)
        return h * 60 + m
      }
      if (toMin(endTime) - toMin(startTime) < 1) {
        setTimeError(t('timeError'))
      } else {
        setTimeError(null)
      }
    } else {
      setTimeError(null)
    }
  }, [allDay, startTime, endTime, t])

  // Initialize fields whenever the modal opens (add or edit)
  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? '')
      setAllDay(event?.all_day ?? false)
      setStartTime(event?.start_time ? event.start_time.slice(0, 5) : '')
      setEndTime(event?.end_time ? event.end_time.slice(0, 5) : '')
      setNote(event?.note ?? '')
      setVisibility(event?.visibility ?? defaultVisibility)
      setPresetId(null)
    }
  }, [open, event, defaultVisibility])

  const applyPreset = (p: EventPreset) => {
    setTitle(p.title || '')
    setAllDay(p.all_day ?? false)
    setStartTime(p.start_time ? p.start_time.slice(0, 5) : '')
    setEndTime(p.end_time ? p.end_time.slice(0, 5) : '')
    setNote(p.note ?? '')
    setVisibility(p.visibility ?? 'members')
    setPresetId(p.id)
  }

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
      preset_id: presetId,
    })
  }

  const dateLabel = date ? date.format('YYYY-MM-DD') : ''
  // Show the preset block when adding a new event (not editing), if there are
  // presets to pick from OR the admin needs the manage entry to create them.
  const showPresets = !isEdit && (presets.length > 0 || isAdmin)

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
                  <X size={20} />
                </button>
              </div>

              {showPresets && (
                <div className="preset-block">
                  <div className="preset-label">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <SquaresFour size={14} /> {t('presets')}
                    </span>
                    {isAdmin && (
                      <button className="preset-manage" onClick={onManagePresets}>
                        {t('managePresets')}
                      </button>
                    )}
                  </div>
                  <div className="preset-scroll">
                    {presets.map((p) => (
                      <motion.button
                        key={p.id}
                        className="preset-chip"
                        onClick={() => applyPreset(p)}
                        whileTap={{ scale: 0.96 }}
                        style={p.color ? { borderColor: p.color } : undefined}
                      >
                        <span className="preset-chip-dot" style={p.color ? { background: p.color } : undefined} />
                        <span className="preset-chip-title">
                          {p.title}
                          {p.start_time ? <em>{p.start_time.slice(0, 5)}</em> : null}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <div className="editor-field">
                <input
                  className="text-input editor-title"
                  placeholder={t('title')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  enterKeyHint="done"
                />
              </div>

              <div className="editor-field editor-all-day">
                <span className="field-label">{t('allDay')}</span>
                <button type="button" className={`switch ${allDay ? 'on' : ''}`} onClick={() => setAllDay((v) => !v)} aria-pressed={allDay} />
              </div>

              {!allDay && (
                <div className="editor-field">
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

              <div className="editor-field">
                <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} />
              </div>

              {timeError && (
                <div className="editor-error">{timeError}</div>
              )}

              <div className="editor-field">
                <div className="field-label">{t('visibility')}</div>
                <VisibilityPicker value={visibility} onChange={setVisibility} />
              </div>

              <div className="editor-actions">
                {isEdit && onDelete && (
                  <button className="btn btn-danger" onClick={() => onDelete(event!.id)}>
                    <Trash size={18} />
                  </button>
                )}
                <button className="btn btn-ghost" onClick={onClose}>
                  {t('cancel')}
                </button>
                <button className="btn btn-primary" onClick={submit} disabled={!title.trim() || Boolean(timeError)}>
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