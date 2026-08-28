import { useCallback, useEffect, useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { motion } from 'framer-motion'
import { GearSix, SignIn } from '@phosphor-icons/react'
import { useAuth } from './context/AuthContext'
import { usePrefs } from './context/PreferencesContext'
import { useI18n } from './lib/i18n'
import { isBackendConfigured } from './lib/config'
import { displayNameOf, createEvent, updateEvent, deleteEvent, fetchMonthEvents } from './lib/data'
import type { AppEvent, Visibility } from './lib/types'
import TopBar from './components/TopBar'
import MonthCalendar from './components/MonthCalendar'
import DaySheet from './components/DaySheet'
import EventEditor from './components/EventEditor'
import SettingsModal from './components/SettingsModal'
import MembersManageModal from './components/MembersManageModal'
import LoginModal from './components/LoginModal'

export default function App() {
  const { t } = useI18n()
  const { user, loading } = useAuth()
  const { defaultVisibility } = usePrefs()

  const [viewDate, setViewDate] = useState<Dayjs>(dayjs())
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [events, setEvents] = useState<AppEvent[]>([])
  const [editor, setEditor] = useState<{ open: boolean; event: AppEvent | null }>({ open: false, event: null })
  const [showSettings, setShowSettings] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const loadMonth = useCallback((d: Dayjs) => {
    return fetchMonthEvents(d.year(), d.month()).then(setEvents)
  }, [])

  // Load month events; refetch when month or auth changes (visibility is auth-dependent)
  useEffect(() => {
    if (isBackendConfigured) loadMonth(viewDate)
  }, [viewDate, user?.id, loading, loadMonth])

  const uid = user?.id

  const handleSave = async (v: {
    id?: string
    title: string
    start_time: string | null
    end_time: string | null
    all_day: boolean
    note: string
    visibility: Visibility
  }) => {
    if (!uid || !selectedDate) return
    const date = selectedDate.format('YYYY-MM-DD')
    if (v.id) {
      const ok = await updateEvent(v.id, {
        title: v.title,
        start_time: v.start_time,
        end_time: v.end_time,
        all_day: v.all_day,
        note: v.note,
        visibility: v.visibility,
      })
      if (!ok) return
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
      })
      if (!created) return
    }
    setEditor({ open: false, event: null })
    await loadMonth(viewDate)
  }

  const handleDelete = async (id: string) => {
    await deleteEvent(id)
    setEditor({ open: false, event: null })
    await loadMonth(viewDate)
  }

  const handleSelectDay = (d: Dayjs) => {
    setSelectedDate(d)
    // If viewing another month, jump the calendar to that month too
    if (d.month() !== viewDate.month() || d.year() !== viewDate.year()) {
      setViewDate(d)
    }
  }

  const openAdd = () => {
    if (!user) {
      setShowLogin(true)
      return
    }
    setSelectedDate((prev) => prev ?? dayjs())
    setEditor({ open: true, event: null })
  }

  const openEdit = (e: AppEvent) => {
    // Only the owner can edit
    if (!user || e.owner_id !== user.id) {
      if (!user) setShowLogin(true)
      return
    }
    setEditor({ open: true, event: e })
  }

  const dayEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate.format('YYYY-MM-DD'))
    : []

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
          <MonthCalendar
            viewDate={viewDate}
            onPrev={() => setViewDate((d) => d.subtract(1, 'month'))}
            onNext={() => setViewDate((d) => d.add(1, 'month'))}
            onToday={() => setViewDate(dayjs())}
            events={events}
            selectedDate={selectedDate}
            onSelectDay={handleSelectDay}
            weekStartsOn="mon"
          />
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

      {selectedDate && (
        <DaySheet
          date={selectedDate}
          events={dayEvents}
          onClose={() => setSelectedDate(null)}
          onAdd={openAdd}
          onEdit={openEdit}
        />
      )}

      <button className="fab" onClick={openAdd} aria-label={t('add')}>
        <span>+</span>
      </button>

      <EventEditor
        open={editor.open}
        date={selectedDate}
        event={editor.event}
        defaultVisibility={defaultVisibility}
        onClose={() => setEditor({ open: false, event: null })}
        onSave={handleSave}
        onDelete={editor.event ? handleDelete : undefined}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onManageMembers={() => setShowMembers(true)}
      />
      <MembersManageModal open={showMembers} onClose={() => setShowMembers(false)} />
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  )
}
