import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { priorityTone } from '@/features/reminders/reminderFormUtils'
import { ApiError } from '@/services/apiClient'
import { getReminderCalendar, type CalendarReminder } from '@/services/reminderService'
import { addMonths, dubaiToday, monthRange } from '@/utils/date'

function daysInCalendarGrid(year: number, monthIndex0: number) {
  const firstWeekday = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
  const cells: Array<{ date: string | null; day: number | null }> = []
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date, day: d })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })
  return cells
}

export function ReminderCalendarPage() {
  const today = dubaiToday()
  const initial = useMemo(() => {
    const [y, m] = today.split('-').map(Number)
    return { year: y!, monthIndex0: m! - 1 }
  }, [today])
  const [cursor, setCursor] = useState(initial)
  const [items, setItems] = useState<CalendarReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')

  const range = monthRange(cursor.year, cursor.monthIndex0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getReminderCalendar(range.from, range.to)
      setItems(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load calendar')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarReminder[]>()
    for (const item of items) {
      const list = map.get(item.eventDate) ?? []
      list.push(item)
      map.set(item.eventDate, list)
    }
    return map
  }, [items])

  const cells = daysInCalendarGrid(cursor.year, cursor.monthIndex0)
  const monthLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(cursor.year, cursor.monthIndex0, 1)))

  const weekStartIndex = useMemo(() => {
    const todayCell = cells.findIndex((c) => c.date === today)
    if (todayCell >= 0) return Math.floor(todayCell / 7) * 7
    return 0
  }, [cells, today])

  const visibleCells = view === 'week' ? cells.slice(weekStartIndex, weekStartIndex + 7) : cells

  return (
    <div>
      <PageHeader
        title="Reminder Calendar"
        description="Month markers use Asia/Dubai event dates. Click an event to open detail."
        breadcrumb={<span>Home / Reminders / Calendar</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/reminders" variant="secondary">
              List
            </ButtonLink>
            <Button
              variant={view === 'month' ? 'primary' : 'secondary'}
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'primary' : 'secondary'}
              onClick={() => setView('week')}
            >
              Week
            </Button>
          </div>
        }
      />

      <Card
        title={monthLabel}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCursor((c) => addMonths(c.year, c.monthIndex0, -1))}
            >
              Prev
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCursor(initial)}>
              Today
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCursor((c) => addMonths(c.year, c.monthIndex0, 1))}
            >
              Next
            </Button>
          </div>
        }
      >
        {loading ? <LoadingState label="Loading calendar…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error ? (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600">
                {d}
              </div>
            ))}
            {visibleCells.map((cell, idx) => {
              const events = cell.date ? byDate.get(cell.date) ?? [] : []
              const isToday = cell.date === today
              return (
                <div
                  key={`${cell.date ?? 'x'}-${idx}`}
                  className={`min-h-24 bg-white p-2 ${isToday ? 'ring-2 ring-inset ring-slate-800' : ''}`}
                >
                  <div className="mb-1 text-xs font-medium text-slate-600">{cell.day ?? ''}</div>
                  <div className="space-y-1">
                    {events.slice(0, view === 'week' ? 8 : 3).map((ev) => (
                      <Link
                        key={ev.id}
                        to={`/reminders/${ev.id}`}
                        className="block truncate rounded-lg bg-slate-100 px-1.5 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-200"
                        title={ev.title}
                      >
                        <Badge tone={priorityTone(ev.priority)}>{ev.priority.slice(0, 1)}</Badge>{' '}
                        {ev.title}
                      </Link>
                    ))}
                    {events.length > (view === 'week' ? 8 : 3) ? (
                      <p className="text-[10px] text-slate-500">+{events.length - (view === 'week' ? 8 : 3)} more</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </Card>
    </div>
  )
}
