import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Trash, SquaresFour, ClockCounterClockwise } from '@phosphor-icons/react'
import type { Dayjs } from 'dayjs'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import VisibilityPicker from './VisibilityPicker'
import { fetchActiveMembers, fetchParticipantIds, fetchVisibilityMemberIds, listRevisions } from '../lib/data'
import type { AppEvent, EventPreset, EventRevision, Visibility } from '../lib/types'

interface MemberOption {
  id: string
  email: string | null
  full_name: string | null
}

/** Toggle chips of selectable members (for participants / specific-visibility). */
function MemberSelect({
  label,
  options,
  selected,
  onToggle,
  empty,
}: {
  label: string
  options: MemberOption[]
  selected: string[]
  onToggle: (id: string) => void
  empty: string
}) {
  const name = (m: MemberOption) => m.full_name || (m.email ? m.email.split('@')[0] : 'member')
  return (
    <div className="editor-field">
      <div className="field-label">{label}</div>
      {options.length === 0 ? (
        <div className="editor-error" style={{ marginBottom: 0 }}>{empty}</div>
      ) : (
        <div className="member-chips">
          {options.map((m) => {
            const on = selected.includes(m.id)
            return (
              <button key={m.id} type="button" className={`member-chip ${on ? 'on' : ''}`} onClick={() => onToggle(m.id)}>
                <span className="member-avatar">{name(m)[0]?.toUpperCase()}</span>
                {name(m)}
                {on && <span className="member-chip-check">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface EditorProps {
  open: boolean
  date: Dayjs | null
  event: AppEvent | null
  presets: EventPreset[]
  isAdmin: boolean
  defaultVisibility: Visibility
  onClose: () => void
  onSave: (v: {
    id?: string
    title: string
    start_time: string | null
    end_time: string | null
    all_day: boolean
    note: string
    visibility: Visibility
    preset_id?: string | null
    participantIds?: string[]
    visibilityMemberIds?: string[]
    revisionReason?: string | null
    prevSnapshot?: { title: string; start_time: string | null; end_time: string | null; all_day: boolean; note: string; visibility: Visibility } | null
  }) => void
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
  const { user } = useAuth()
  const isEdit = Boolean(event)

  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility)
  const [presetId, setPresetId] = useState<string | null>(null)
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [visibilityMemberIds, setVisibilityMemberIds] = useState<string[]>([])
  const [revisionReason, setRevisionReason] = useState('')
  const [revisions, setRevisions] = useState<EventRevision[]>([])
  const [showRevisions, setShowRevisions] = useState(false)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [timeError, setTimeError] = useState<string | null>(null)

  // Load member options + (when editing) participant/visibility ids + revisions.
  useEffect(() => {
    let cancelled = false
    if (open && user) {
      fetchActiveMembers().then((m) => !cancelled && setMembers(m as MemberOption[]))
      if (event) {
        fetchParticipantIds(event.id).then((ids) => !cancelled && setParticipantIds(ids))
        fetchVisibilityMemberIds(event.id).then((ids) => !cancelled && setVisibilityMemberIds(ids))
        listRevisions(event.id).then((rs) => !cancelled && setRevisions(rs))
      }
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.id, user?.id])

  // End-time validation (req 6)
  useEffect(() => {
    if (!allDay && startTime && endTime) {
      const toMin = (s: string) => {
        const [h, m] = s.split(':').map(Number)
        return h * 60 + m
      }
      setTimeError(toMin(endTime) - toMin(startTime) < 1 ? t('timeError') : null)
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
      setRevisionReason('')
      setShowRevisions(false)
      if (!event) {
        setRevisions([])
        setParticipantIds([])
        setVisibilityMemberIds([])
      }
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
    if (!title.trim() || timeError) return
    if (isEdit && event) {
      if (!revisionReason.trim()) return
      onSave({
        id: event.id,
        title: title.trim(),
        start_time: allDay || !startTime ? null : startTime,
        end_time: allDay || !endTime ? null : endTime,
        all_day: allDay,
        note: note.trim(),
        visibility,
        participantIds,
        visibilityMemberIds,
        revisionReason: revisionReason.trim(),
        prevSnapshot: {
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          all_day: event.all_day,
          note: event.note ?? '',
          visibility: event.visibility,
        },
      })
    } else {
      onSave({
        id: event?.id,
        title: title.trim(),
        start_time: allDay || !startTime ? null : startTime,
        end_time: allDay || !endTime ? null : endTime,
        all_day: allDay,
        note: note.trim(),
        visibility,
        preset_id: presetId,
        participantIds,
        visibilityMemberIds,
      })
    }
  }

  const dateLabel = date ? date.format('YYYY-MM-DD') : ''
  const showPresets = !isEdit && (presets.length > 0 || isAdmin)
  const editable = !event || user?.id === event.owner_id || participantIds.includes(user?.id || '')

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="modal" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            >
              <div className="modal-head">
                <div>
                  <div className="modal-title">{isEdit ? t('editEvent') : t('addEvent')}</div>
                  {dateLabel && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{dateLabel}</div>}
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
                    {isAdmin && <button className="preset-manage" onClick={onManagePresets}>{t('managePresets')}</button>}
                  </div>
                  <div className="preset-scroll">
                    {presets.map((p) => (
                      <motion.button key={p.id} className="preset-chip" onClick={() => applyPreset(p)} whileTap={{ scale: 0.96 }} style={p.color ? { borderColor: p.color } : undefined}>
                        <span className="preset-chip-dot" style={p.color ? { background: p.color } : undefined} />
                        <span className="preset-chip-title">{p.title}{p.start_time ? <em>{p.start_time.slice(0, 5)}</em> : null}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <div className="editor-field">
                <input className="text-input editor-title" placeholder={t('title')} value={title} onChange={(e) => setTitle(e.target.value)} enterKeyHint="done" disabled={!editable} />
              </div>

              {!editable && (
                <div className="editor-error">{t('readOnly')}</div>
              )}

              <div className="editor-field editor-all-day">
                <span className="field-label">{t('allDay')}</span>
                <button type="button" className={`switch ${allDay ? 'on' : ''}`} onClick={() => setAllDay((v) => !v)} aria-pressed={allDay} disabled={!editable} />
              </div>

              {!allDay && (
                <div className="editor-field">
                  <div className="time-row">
                    <div>
                      <div className="field-label">{t('startTime')}</div>
                      <input type="time" className="time-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!editable} />
                    </div>
                    <div>
                      <div className="field-label">{t('endTime')}</div>
                      <input type="time" className="time-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!editable} />
                    </div>
                  </div>
                </div>
              )}

              <div className="editor-field">
                <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePlaceholder')} disabled={!editable} />
              </div>

              {timeError && <div className="editor-error">{timeError}</div>}

              <div className="editor-field">
                <div className="field-label">{t('visibility')}</div>
                <VisibilityPicker value={visibility} onChange={setVisibility} />
              </div>

              {visibility === 'specific' && (
                <MemberSelect
                  label={t('visibleToMembers')}
                  options={members}
                  selected={visibilityMemberIds}
                  onToggle={(id) => setVisibilityMemberIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
                  empty={t('noMembers2')}
                />
              )}

              <MemberSelect
                label={t('participants')}
                options={members}
                selected={participantIds}
                onToggle={(id) => setParticipantIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
                empty={t('noMembers')}
              />

              {isEdit && event && (
                <>
                  <div className="editor-field">
                    <div className="field-label">{t('revisionReason')}</div>
                    <textarea className="textarea" value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder={t('revisionReasonPlaceholder')} disabled={!editable} />
                  </div>
                  {revisions.length > 0 && (
                    <button className="editor-history-toggle" onClick={() => setShowRevisions(!showRevisions)}>
                      <ClockCounterClockwise size={14} /> {t('history')}
                    </button>
                  )}
                  {showRevisions && (
                    <div className="revision-list">
                      {revisions.map((r) => (
                        <div key={r.id} className="revision-item">
                          <div className="revision-title">{r.prev_title || '…'}</div>
                          <div className="revision-note">{r.reason || t('noReason')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="editor-actions">
                {isEdit && onDelete && (
                  <button className="btn btn-danger" onClick={() => onDelete(event!.id)}>
                    <Trash size={18} />
                  </button>
                )}
                <button className="btn btn-ghost" onClick={onClose}>
                  {t('cancel')}
                </button>
                <button className="btn btn-primary" onClick={submit} disabled={!title.trim() || Boolean(timeError) || (isEdit && !revisionReason.trim())}>
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