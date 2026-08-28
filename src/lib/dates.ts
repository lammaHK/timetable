import dayjs, { Dayjs } from 'dayjs'

export type CalendarCell = {
  date: Dayjs
  inMonth: boolean
}

/** Return a fixed 6-row grid for the given month. weekStartsOn: 'mon' | 'sun'. */
export function getMonthGrid(year: number, month: number, weekStartsOn: 'mon' | 'sun' = 'mon'): CalendarCell[][] {
  const off = weekStartsOn === 'sun' ? 0 : 1
  const firstOfMonth = dayjs(new Date(year, month, 1))
  const start = firstOfMonth.startOf('week').add(off, 'day')
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = start.add(i, 'day')
    cells.push({ date: d, inMonth: d.month() === month })
  }
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function formatTime(t: string | null): string {
  if (!t) return ''
  return dayjs(`2000-01-01T${t}`).format('HH:mm')
}

export function todayISO(): string {
  return dayjs().format('YYYY-MM-DD')
}
