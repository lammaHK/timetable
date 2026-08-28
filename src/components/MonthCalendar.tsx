import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import type { Dayjs } from 'dayjs'
import { getMonthGrid } from '../lib/dates'
import { useI18n, monthNames } from '../lib/i18n'
import { getDateInfo } from '../lib/cn'
import type { AppEvent } from '../lib/types'

// Fixed Sun→Sat column order
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export default function MonthCalendar({
  viewDate,
  onPrev,
  onNext,
  onToday,
  events,
  selectedDate,
  onSelectDay,
  presetColors = {},
}: {
  viewDate: Dayjs
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  events: AppEvent[]
  selectedDate: Dayjs | null
  onSelectDay: (d: Dayjs) => void
  presetColors?: Record<string, string>
}) {
  const { t, lang } = useI18n()

  // grid always Sunday-first
  const grid = useMemo(
    () => getMonthGrid(viewDate.year(), viewDate.month(), 'sun'),
    [viewDate],
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
            <CaretLeft size={20} />
          </button>
          <button className="nav-round" onClick={onNext} aria-label="next">
            <CaretRight size={20} />
          </button>
        </div>
      </div>

      <div className="weekdays">
        {WEEKDAY_KEYS.map((w, i) => (
          <div key={w} className={`weekday ${i === 0 ? 'wk-sun' : i === 6 ? 'wk-sat' : ''}`}>
            {t(('weekday_' + w) as never)}
          </div>
        ))}
      </div>

      {selectedDate && renderSelectedMarker(selectedDate, lang)}

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
            const wd = cell.date.day() // 0=Sun
            const isWeekend = wd === 0 || wd === 6
            const dayEvents = eventsByDate.get(iso)
            const dots = Math.min(dayEvents?.length ?? 0, 3)
            const presetColor = presetColors[iso]
            const cn = getDateInfo(iso)
            const marker = cn.holiday || cn.festival

            return (
              <motion.button
                key={iso}
                className={`day-cell in-month ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isWeekend ? 'wk-end' : ''} ${marker ? 'holiday' : ''} ${itemClass(wd)}`}
                onClick={() => onSelectDay(cell.date)}
                whileTap={{ scale: 0.92 }}
                animate={isSelected ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={isSelected ? { duration: 0.4, times: [0, 0.5, 1] } : undefined}
                aria-label={iso}
              >
                <span className="day-num">{cell.date.date()}</span>
                <span className={`day-lunar ${isSelected ? 'on' : ''}`}>{cn.lunarDay}</span>
                {marker && <span className="holiday-dot" aria-label={marker} />}
                <span className="day-dots">
                  {Array.from({ length: dots }).map((_, i) => (
                    <span key={i} className="day-dot" style={presetColor ? { background: presetColor } : undefined} />
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

function itemClass(wd: number): string {
  if (wd === 0) return 'w0-sun'
  if (wd === 6) return 'w6-sat'
  return ''
}

/** 選定日若是公眾假期/節日，在月曆上方顯示完整名稱（進出動畫）。 */
function renderSelectedMarker(date: Dayjs, lang: string) {
  const iso = date.format('YYYY-MM-DD')
  const cn = getDateInfo(iso)
  const label = cn.holiday || cn.festival
  const isZh = lang === 'zh'
  if (!label) return null
  const sub = isZh
    ? cn.holiday ? `公眾假期 · 農曆${cn.lunarFull}` : `節日 · ${cn.lunarFull}`
    : cn.lunarFull
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={iso}
        className="selected-marker"
        initial={{ opacity: 0, y: -6, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -4, height: 0 }}
        transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className={`selected-marker-badge ${cn.holiday ? 'holiday' : 'festival'}`}>
          <span className="selected-marker-title">{label}</span>
          <span className="selected-marker-sub">{sub}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
