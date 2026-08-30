import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Trash, SquaresFour, ClockCounterClockwise } from '@phosphor-icons/react'
import dayjs, { Dayjs } from 'dayjs'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'
import VisibilityPicker from './VisibilityPicker'
import { fetchActiveMembers, fetchParticipantIds, fetchVisibilityMemberIds, listRevisions } from '../lib/data'
import { getDateInfo } from '../lib/cn'
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
    dates?: string[]
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
  const [partError, setPartError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<'normal' | 'forced'>('normal')
  const [multiDates, setMultiDates] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

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

  // Time validation: only require end > start when both are set. Fill one side alone is allowed.
  useEffect(() => {
    if (allDay) {
      setTimeError(null)
      return
    }
    if (startTime && endTime) {
      const toMin = (s: string) => {
        const [h, m] = s.split(':').map(Number)
        return h * 60 + m
      }
      setTimeError(toMin(endTime) - toMin(startTime) < 1 ? t('timeError') : null)
      return
    }
    setTimeError(null)
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
      setMultiDates([])
      if (!event) {
        setRevisions([])
        // creator is a participant by default, so saving never blocks on empty participants
        setParticipantIds(user ? [user.id] : [])
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

  const submit = async () => {
    if (saving || !title.trim() || timeError) return
    setSaving(true)
    if (isEdit && event) {
      const forced = editMode === 'forced'
      if (forced && !revisionReason.trim()) {
        setSaving(false)
        return
      }
      await onSave({
        id: event.id,
        title: title.trim(),
        start_time: allDay || !startTime ? null : startTime,
        end_time: allDay || !endTime ? null : endTime,
        all_day: allDay,
        note: note.trim(),
        visibility,
        participantIds,
        visibilityMemberIds,
        dates: undefined,
        // only forced changes carry a reason + full previous snapshot
        revisionReason: forced ? revisionReason.trim() : null,
        prevSnapshot: forced
          ? {
              title: event.title,
              start_time: event.start_time,
              end_time: event.end_time,
              all_day: event.all_day,
              note: event.note ?? '',
              visibility: event.visibility,
            }
          : null,
      })
    } else {
      await onSave({
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
        dates: multiDates.length ? multiDates : undefined,
      })
    }
    setSaving(false)
  }

  const dateLabel = date ? date.format('YYYY-MM-DD') : ''
  const showPresets = !isEdit && (presets.length > 0 || isAdmin)
  const editable = !event || !user || isAdmin || user.id === event.owner_id || participantIds.includes(user.id)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
          <motion.div className="modal" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', damping: 28, stiffness: 340 } }}
              exit={{ y: 28, opacity: 0, scale: 0.985, transition: { duration: 0.22, ease: 'easeOut' } }}
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

              {date && <EventDateBanner iso={date.format('YYYY-MM-DD')} />}

              {!isEdit && (
                <div className="editor-field">
                  <div className="field-label">{t('multiDate')}</div>
                  <div className="multi-toggle">
                    <button type="button" className={`switch ${multiDates.length ? 'on' : ''}`} onClick={() => setMultiDates(multiDates.length ? [] : [date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')])} aria-pressed={!!multiDates.length} />
                    <span className="multi-hint">{t('multiDateHint')}</span>
                  </div>
                  {multiDates.length > 0 && (
                    <div className="multi-picker">
                      <div className="multi-label">{t('pickDates')}</div>
                      <div className="multi-grid">
                        {Array.from({ length: 14 }).map((_, i) => {
                          const d = date ? date.subtract(2, 'day').add(i, 'day') : dayjs().add(i, 'day')
                          const iso = d.format('YYYY-MM-DD')
                          const on = multiDates.includes(iso)
                          return (
                            <button
                              key={iso}
                              type="button"
                              className={`multi-day ${on ? 'on' : ''}`}
                              onClick={() => setMultiDates((p) => (on ? p.filter((x) => x !== iso) : [...p, iso]))}
                            >
                              {d.date()}
                            </button>
                          )
                        })}
                      </div>
                      {multiDates.length > 1 && (
                        <div className="multi-selected">{multiDates.length} {t('days')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {/* Title + all-day toggle on the first row */}
              <div className="editor-field title-row">
                <input className="text-input editor-title" placeholder={t('title')} value={title} onChange={(e) => setTitle(e.target.value)} enterKeyHint="done" disabled={!editable} />
                <div className="all-day-inline">
                  <span className="all-day-label">{t('allDay')}</span>
                  <button type="button" className={`switch ${allDay ? 'on' : ''}`} onClick={() => setAllDay((v) => !v)} aria-pressed={allDay} disabled={!editable} />
                </div>
              </div>

              {!editable && (
                <div className="editor-error">{t('readOnly')}</div>
              )}

              {!allDay && (
                <div className="editor-field">
                  <div className="time-row">
                    <div className="time-col">
                      <div className="field-label">{t('startTime')}</div>
                      <input type="time" className="time-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!editable} />
                    </div>
                    <div className="time-sep">—</div>
                    <div className="time-col">
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

              {/* Edit mode: normal (no reason) vs forced (reason + history) */}
              {isEdit && event && (
                <div className="editor-field">
                  <div className="field-label">{t('revisionReason')}</div>
                  <div className="seg seg-2">
                    <button type="button" className={`seg-item ${editMode === 'normal' ? 'active' : ''}`} onClick={() => setEditMode('normal')}>
                      {t('editModeNormal')}
                      <span className="seg-hint">{t('editModeNormalHint')}</span>
                    </button>
                    <button type="button" className={`seg-item ${editMode === 'forced' ? 'active' : ''}`} onClick={() => setEditMode('forced')}>
                      {t('editModeForced')}
                      <span className="seg-hint">{t('editModeForcedHint')}</span>
                    </button>
                  </div>
                  {editMode === 'forced' && (
                    <textarea className="textarea" style={{ marginTop: 8 }} value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder={t('revisionReasonPlaceholder')} disabled={!editable} />
                  )}
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
                </div>
              )}

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
                onToggle={(id) => setParticipantIds((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; if (n.length) setPartError(null); return n; })}
                empty={t('noMembers')}
              />
              {partError && <div className="editor-error">{partError}</div>}

              <div className="editor-actions">
                {isEdit && onDelete && (
                  <button className="btn btn-danger" onClick={() => { if (confirm(t('confirmDelete'))) onDelete(event!.id) }}>
                    <Trash size={18} />
                  </button>
                )}
                <button className="btn btn-ghost" onClick={onClose}>
                  {t('cancel')}
                </button>
                <button className="btn btn-primary" onClick={() => { if (!isEdit || confirm(t('confirmSave'))) submit() }} disabled={saving || !title.trim() || Boolean(timeError) || (isEdit && editMode === 'forced' && !revisionReason.trim())}>
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** 日期橫幅：星期 + 農曆 + 節日/假期，讓新增視窗有視覺焦點。 */
function EventDateBanner({ iso }: { iso: string }) {
  const { lang } = useI18n()
  const info = getDateInfo(iso)
  const [y, m, d] = iso.split('-').map(Number)
  const WEEK_EN_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const date = new Date(y, m - 1, d)
  const wd = date.getDay()
  const weekday = lang === 'zh' ? `週${['日', '一', '二', '三', '四', '五', '六'][wd]}` : WEEK_EN_S[wd]
  const long = lang === 'zh' ? `${m}月${d}日` : `${m}/${d}`

  return (
    <div className={`date-banner ${info.holiday ? 'has-mark' : ''}`}>
      <div className="date-banner-main">
        <span className="date-banner-day">{d}</span>
        <span className="date-banner-side">
          <span className="date-banner-week">{weekday}</span>
          <span className="date-banner-lunar">{info.holiday || info.festival || info.lunarFull}</span>
        </span>
      </div>
      <span className="date-banner-long">{lang === 'zh' ? `${long} · 農曆${info.lunarFull}` : info.lunarFull}</span>
    </div>
  )
}