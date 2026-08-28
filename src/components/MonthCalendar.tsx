import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Dayjs } from 'dayjs'
import { getMonthGrid, WEEKDAYS } from '../lib/dates'
import { useI18n, monthNames } from '../lib/i18n'
import type { AppEvent } from '../lib/types'

export default function MonthCalendar({
  viewDate,
  onPrev,
  onNext,
  onToday,
  events,
  selectedDate,
  onSelectDay,
  weekStartsOn,
}: {
  viewDate: Dayjs
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  events: AppEvent[]
  selectedDate: Dayjs | null
  onSelectDay: (d: Dayjs) => void
  weekStartsOn: 'mon' | 'sun'
}) {
  const { t, lang } = useI18n()

  const grid = useMemo(
    () => getMonthGrid(viewDate.year(), viewDate.month(), weekStartsOn),
    [viewDate, weekStartsOn],
  )

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AppEvent[]>()
    for (const e of events) {
      const arr = map.get(e.date) || []
      arr.push(e)
      map.set(e.date, arr)
    }
    return map
  }, [events])

  // Weekday header order depends on weekStartsOn
  const weekdayOrder = useMemo(() => {
    if (weekStartsOn === 'sun') return ['sun', ...WEEKDAYS.slice(0, 6)]
    return WEEKDAYS
  }, [weekStartsOn])

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="month-nav">
        <button className="month-title" onClick={onToday} style={{ cursor: 'pointer' }}>
          {monthNames(lang, viewDate.month())} {viewDate.year()}
        </button>
        <div className="month-nav-btns">
          <button className="nav-round" onClick={onPrev} aria-label="prev">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button className="nav-round" onClick={onNext} aria-label="next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="weekdays">
        {weekdayOrder.map((w) => (
          <div key={w} className="weekday">
            {t(('weekday_' + w) as never)}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewDate.format('YYYY-MM')}
          className="cal-grid"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {grid.flat().map((cell) => {
            const iso = cell.date.format('YYYY-MM-DD')
            const isToday = iso === todayStr
            const isSelected = selectedDate?.format('YYYY-MM-DD') === iso
            const dayEvents = eventsByDate.get(iso)
            const dots = Math.min(dayEvents?.length ?? 0, 4)
            return (
              <motion.button
                key={iso}
                className={`day-cell ${cell.inMonth ? 'in-month' : 'out-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDay(cell.date)}
                whileTap={{ scale: 0.94 }}
                aria-label={iso}
              >
                <span className="day-num">{cell.date.date()}</span>
                <span className="day-dots">
                  {Array.from({ length: dots }).map((_, i) => (
                    <span key={i} className="day-dot" />
                  ))}
                </span>
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
