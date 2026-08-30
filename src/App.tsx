import { useCallback, useEffect, useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { motion } from 'framer-motion'
import { GearSix, SignIn } from '@phosphor-icons/react'
import { useAuth } from './context/AuthContext'
import { usePrefs } from './context/PreferencesContext'
import { useI18n } from './lib/i18n'
import { isBackendConfigured } from './lib/config'
import { displayNameOf, createEvent, createGroupEvents, updateEvent, deleteEvent, fetchMonthEvents, fetchPresets, setParticipants, setVisibilityMembers, addRevision } from './lib/data'
import type { AppEvent, EventPreset, Visibility } from './lib/types'
import TopBar from './components/TopBar'
import MonthCalendar from './components/MonthCalendar'
import TodaySection from './components/TodaySection'
import DaySheet from './components/DaySheet'
import EventDetailSheet from './components/EventDetailSheet'
import EventEditor from './components/EventEditor'
import PresetsManageModal from './components/PresetsManageModal'
import SettingsModal from './components/SettingsModal'
import MembersManageModal from './components/MembersManageModal'
import LoginModal from './components/LoginModal'

export default function App() {
  const { t } = useI18n()
  const { user, loading, isAdmin } = useAuth()
  const { defaultVisibility } = usePrefs()

  const [viewDate, setViewDate] = useState<Dayjs>(dayjs())
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [sheetDate, setSheetDate] = useState<Dayjs | null>(null)
  const [detailEvent, setDetailEvent] = useState<AppEvent | null>(null)
  const [events, setEvents] = useState<AppEvent[]>([])
  const [presets, setPresets] = useState<EventPreset[]>([])
  const [editor, setEditor] = useState<{ open: boolean; event: AppEvent | null; date: Dayjs | null }>({ open: false, event: null, date: null })
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  const loadMonth = useCallback((d: Dayjs) => {
    return fetchMonthEvents(d.year(), d.month()).then(setEvents)
  }, [])

  const loadPresets = useCallback(() => {
    if (user) return fetchPresets().then(setPresets)
    return Promise.resolve()
  }, [user])

  // Load month events; refetch when month or auth changes (visibility is auth-dependent)
  useEffect(() => {
    if (isBackendConfigured) loadMonth(viewDate)
  }, [viewDate, user?.id, loading, loadMonth])

  // Load presets for signed-in users (they can apply them when adding)
  useEffect(() => {
    if (user) loadPresets()
  }, [user, loadPresets])

  const uid = user?.id

  const handleSave = async (v: {
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
  }) => {
    if (!uid || !editor.date) return
    const date = editor.date.format('YYYY-MM-DD')
    let targetEventId = v.id ?? null
    if (v.id) {
      const ok = await updateEvent(v.id, {
        title: v.title,
        start_time: v.start_time,
        end_time: v.end_time,
        all_day: v.all_day,
        note: v.note,
        visibility: v.visibility,
      })
      if (!ok) {
        alert(t('saveFailed'))
        return
      }
      // record revision for edits
      if (v.revisionReason && v.prevSnapshot) {
        await addRevision(v.id, v.revisionReason, v.prevSnapshot)
      }
      targetEventId = v.id
      // cleanup participants for multi-date groups
      if (v.participantIds) await setParticipants(v.id, v.participantIds)
      if (v.visibilityMemberIds) await setVisibilityMembers(v.id, v.visibilityMemberIds)
    } else if (v.dates && v.dates.length) {
      // multi-date event
      const base = {
        owner_id: uid,
        owner_name: displayNameOf(user?.email, user?.user_metadata),
        start_time: v.start_time,
        end_time: v.end_time,
        all_day: v.all_day,
        title: v.title,
        note: v.note,
        visibility: v.visibility,
        sort_order: 100,
        preset_id: v.preset_id ?? null,
      }
      const ok = await createGroupEvents(v.dates, base)
      if (!ok) {
        alert(t('saveFailed'))
        return
      }
      // participants applied per event row after creation is complex; skip for group (participants set via one?)
      targetEventId = null
    } else {
      const created = await createEvent({
        owner_id: uid,
        owner_name: displayNameOf(user?.email, user?.user_metadata),
        date,
        start_time: v.start_time,
        end_time: v.end_time,
        all_day: v.all_day,
        title: v.title,
        note: v.note,
        visibility: v.visibility,
        sort_order: 100,
        preset_id: v.preset_id ?? null,
      })
      if (!created) {
        alert(t('saveFailed'))
        return
      }
      targetEventId = created.id
    }
    // sync participants + specific-visibility members
    if (targetEventId) {
      if (v.participantIds) await setParticipants(targetEventId, v.participantIds)
      if (v.visibilityMemberIds) await setVisibilityMembers(targetEventId, v.visibilityMemberIds)
    }
    setEditor({ open: false, event: null, date: null })
    await loadMonth(viewDate)
  }

  const handleDelete = async (id: string) => {
    await deleteEvent(id)
    setEditor({ open: false, event: null, date: null })
    await loadMonth(viewDate)
  }

  const handleSelectDay = (d: Dayjs) => {
    setSelectedDate(d)
    // If viewing another month, jump the calendar to that month too
    if (d.month() !== viewDate.month() || d.year() !== viewDate.year()) {
      setViewDate(d)
    }
  }

  const openAddForDate = (d: Dayjs) => {
    if (!user) {
      setShowLogin(true)
      return
    }
    setEditor({ open: true, event: null, date: d })
  }

  const openEdit = (e: AppEvent) => {
    // Owner, participants, or admins can open the editor (admins may also remove anyone's event)
    const canEdit = user && (e.owner_id === user.id || isAdmin)
    if (!canEdit) {
      if (!user) setShowLogin(true)
      return
    }
    setEditor({ open: true, event: e, date: dayjs(e.date) })
  }

  const dayEvents = sheetDate
    ? events.filter((e) => e.date === sheetDate.format('YYYY-MM-DD'))
    : []

  // date -> color + preset name, for dates that have events created from a colored preset
  const presetById = new Map(presets.map((p) => [p.id, p] as [string, EventPreset]))
  const presetColors: Record<string, string> = {}
  const presetInfoByDate: Record<string, { color: string; name: string }> = {}
  for (const e of events) {
    const p = e.preset_id ? presetById.get(e.preset_id) : undefined
    if (p && p.color) {
      presetColors[e.date] = p.color
      presetInfoByDate[e.date] = { color: p.color, name: p.title }
    }
  }

  return (
    <div className="app">
      <div className="app-inner">
        <TopBar onOpenSettings={() => setShowSettings(true)} onOpenLogin={() => setShowLogin(true)} />

        {!isBackendConfigured ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div className="empty-icon">
              <GearSix size={34} weight="thin" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{t('notConfigured')}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>{t('notConfiguredHint')}</div>
          </div>
        ) : (
          <>
            <MonthCalendar
              viewDate={viewDate}
              onPrev={() => setViewDate((d) => d.subtract(1, 'month'))}
              onNext={() => setViewDate((d) => d.add(1, 'month'))}
              onToday={() => setViewDate(dayjs())}
              events={events}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
              presetColors={presetColors}
            />
            <TodaySection date={selectedDate} events={events} presetInfo={presetInfoByDate[selectedDate.format('YYYY-MM-DD')]} onOpenDay={(d) => setSheetDate(d)} onOpenEvent={(e) => setDetailEvent(e)} onAdd={(d) => openAddForDate(d)} />
          </>
        )}

        {!user && isBackendConfigured && (
          <motion.div style={{ marginTop: 14 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="banner">
              <div className="banner-icon">
                <SignIn size={18} weight="duotone" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t('guestBanner')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t('signInToEdit')}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowLogin(true)}>
                {t('signIn')}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <DaySheet
        open={!!sheetDate}
        date={sheetDate || selectedDate}
        events={dayEvents}
        onClose={() => setSheetDate(null)}
        onAdd={() => sheetDate && openAddForDate(sheetDate)}
        onEdit={openEdit}
      />
      <EventDetailSheet
        open={!!detailEvent}
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onViewDay={(d) => {
          setDetailEvent(null)
          setSheetDate(d)
        }}
      />

      <EventEditor
        open={editor.open}
        date={editor.date}
        event={editor.event}
        presets={presets}
        isAdmin={isAdmin}
        defaultVisibility={defaultVisibility}
        onClose={() => setEditor({ open: false, event: null, date: null })}
        onSave={handleSave}
        onDelete={editor.event ? handleDelete : undefined}
        onManagePresets={() => setShowPresets(true)}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onManageMembers={() => setShowMembers(true)}
      />
      <MembersManageModal open={showMembers} onClose={() => setShowMembers(false)} />
      <PresetsManageModal
        open={showPresets}
        onClose={() => setShowPresets(false)}
        onSaved={loadPresets}
      />
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  )
}
