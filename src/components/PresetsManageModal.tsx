import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Trash, Check } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { fetchPresets, upsertPreset, deletePreset } from '../lib/data'
import VisibilityPicker from './VisibilityPicker'
import type { EventPreset, Visibility } from '../lib/types'

const COLORS = ['#2fd6bd', '#7aa2ff', '#f0a05a', '#ff6b81', '#b48fff', '#c3e88d', null]

export default function PresetsManageModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const [presets, setPresets] = useState<EventPreset[]>([])
  const [editing, setEditing] = useState<EventPreset | null>(null)
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [visibility, setVisibility] = useState<Visibility>('members')
  const [color, setColor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setPresets(await fetchPresets())
  }, [])

  useEffect(() => {
    if (open) {
      load()
      setEditing(null)
      resetForm()
    }
  }, [open, load])

  const resetForm = () => {
    setTitle('')
    setStartTime('')
    setAllDay(false)
    setVisibility('members')
    setColor(null)
  }

  const startEdit = (p: EventPreset) => {
    setEditing(p)
    setTitle(p.title)
    setStartTime(p.start_time ? p.start_time.slice(0, 5) : '')
    setAllDay(p.all_day)
    setVisibility(p.visibility)
    setColor(p.color)
  }

  const reset = () => {
    setEditing(null)
    resetForm()
  }

  const save = async () => {
    if (!title.trim()) return
    setBusy(true)
    await upsertPreset({
      id: editing?.id,
      title: title.trim(),
      start_time: allDay || !startTime ? null : startTime,
      end_time: null,
      all_day: allDay,
      visibility,
      color,
    })
    setBusy(false)
    reset()
    await load()
    onSaved()
  }

  const remove = async (id: string) => {
    await deletePreset(id)
    await load()
    onSaved()
  }

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
                  <div className="modal-title">{t('managePresets')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>{t('anyoneCanApply')}</div>
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <X size={20} />
                </button>
              </div>

              {/* editor form */}
              <div className="setting-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
                <div className="field" style={{ marginBottom: 10 }}>
                  <div className="field-label">{editing ? t('editPreset') : t('addPreset')}</div>
                  <input
                    className="text-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('title')}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <label className="switch-row" style={{ padding: 0, border: 'none', flex: 1 }}>
                    <span className="switch-label">{t('allDay')}</span>
                    <button type="button" className={`switch ${allDay ? 'on' : ''}`} onClick={() => setAllDay((v) => !v)} aria-pressed={allDay} />
                  </label>
                  {!allDay && (
                    <input type="time" className="time-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  )}
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <div className="field-label">{t('visibility')}</div>
                  <VisibilityPicker value={visibility} onChange={setVisibility} />
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <div className="field-label">{t('colorForDates')}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COLORS.map((c) => (
                      <button
                        key={c ?? 'none'}
                        type="button"
                        className={`color-swatch ${color === c ? 'active' : ''}`}
                        style={c ? { background: c } : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        onClick={() => setColor(c)}
                        aria-label={c ?? 'none'}
                      >
                        {color === c && c && <Check size={14} weight="bold" />}
                        {color === c && !c && <X size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="editor-actions">
                  <button className="btn btn-ghost" onClick={reset} disabled={busy}>
                    {t('cancel')}
                  </button>
                  <button className="btn btn-primary" onClick={save} disabled={!title.trim() || busy}>
                    {editing ? t('save') : t('add')}
                  </button>
                </div>
              </div>

              {/* preset list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {presets.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 20, fontSize: 14 }}>
                    {t('noPresets')}
                  </div>
                )}
                {presets.map((p) => (
                  <div key={p.id} className="event-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="preset-chip-dot" style={p.color ? { background: p.color } : undefined} />
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{p.title}</span>
                    <button className="icon-btn" onClick={() => startEdit(p)} aria-label={t('edit')}>
                      <Plus size={18} />
                    </button>
                    <button className="icon-btn" onClick={() => remove(p.id)} aria-label={t('delete')} style={{ color: 'var(--danger)' }}>
                      <Trash size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}