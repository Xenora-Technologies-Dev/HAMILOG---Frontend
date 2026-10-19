import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { ApiError } from '@/services/apiClient'
import { getReminderCalendar, type CalendarReminder } from '@/services/reminderService'
import { addDaysToDateOnly, addMonths, dubaiToday, monthRange, startOfWeek } from '@/utils/date'

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

function shiftAnchor(anchor: string, view: 'month' | 'week', delta: number): string {
  if (view === 'week') return addDaysToDateOnly(anchor, delta * 7)
  const [year, month, day] = anchor.split('-').map(Number)
  const next = addMonths(year!, month! - 1, delta)
  const last = new Date(Date.UTC(next.year, next.monthIndex0 + 1, 0)).getUTCDate()
  const clamped = Math.min(day!, last)
  return `${next.year}-${String(next.monthIndex0 + 1).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
}

function formatRangeDay(dateStr: string, withYear: boolean): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, month! - 1, day!)))
}

export function ReminderCalendarPage() {
  const today = dubaiToday()
  const [anchor, setAnchor] = useState(today)
  const [items, setItems] = useState<CalendarReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')

  const [year, month] = anchor.split('-').map(Number)
  const monthIndex0 = month! - 1
  const weekStart = startOfWeek(anchor)
  const weekEnd = addDaysToDateOnly(weekStart, 6)
  const range = view === 'week' ? { from: weekStart, to: weekEnd } : monthRange(year!, monthIndex0)
  const rangeFrom = range.from
  const rangeTo = range.to

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      getReminderCalendar(rangeFrom, rangeTo)
        .then((res) => {
          if (!cancelled) setItems(res.data)
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load calendar')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [rangeFrom, rangeTo, reloadKey])

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarReminder[]>()
    for (const item of items) {
      const list = map.get(item.eventDate) ?? []
      list.push(item)
      map.set(item.eventDate, list)
    }
    return map
  }, [items])

  const monthCells = daysInCalendarGrid(year!, monthIndex0)
  const weekCells = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysToDateOnly(weekStart, index)
    return { date, day: Number(date.slice(8, 10)) }
  })
  const visibleCells = view === 'week' ? weekCells : monthCells
  const monthLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year!, monthIndex0, 1)))
  const rangeLabel =
    view === 'week'
      ? `${formatRangeDay(weekStart, weekStart.slice(0, 4) !== weekEnd.slice(0, 4))} – ${formatRangeDay(weekEnd, true)}`
      : monthLabel

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Events appear on the date you chose. Weekly and monthly events repeat on those dates."
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
        title={rangeLabel}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAnchor((current) => shiftAnchor(current, view, -1))}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAnchor(today)}>
              Today
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAnchor((current) => shiftAnchor(current, view, 1))}>
              Next
            </Button>
          </div>
        }
      >
        {loading ? <LoadingState label="Loading calendar…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} /> : null}
        {!loading && !error ? (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600">
                {day}
              </div>
            ))}
            {visibleCells.map((cell, idx) => {
              const events = cell.date ? (byDate.get(cell.date) ?? []) : []
              const isToday = cell.date === today
              const limit = view === 'week' ? 8 : 3
              return (
                <div
                  key={`${cell.date ?? 'empty'}-${idx}`}
                  className={`bg-white p-2 ${view === 'week' ? 'min-h-36' : 'min-h-24'} ${isToday ? 'ring-2 ring-inset ring-slate-800' : ''}`}
                >
                  <div className="mb-1 text-xs font-medium text-slate-600">{cell.day ?? ''}</div>
                  <div className="space-y-1">
                    {events.slice(0, limit).map((event) => (
                      <Link
                        key={`${event.id}-${cell.date}`}
                        to={`/reminders/${event.id}`}
                        className="block truncate rounded-lg bg-slate-100 px-1.5 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-200"
                        title={event.eventTime ? `${event.eventTime} ${event.title}` : event.title}
                      >
                        {event.eventTime ? <span className="text-slate-500">{event.eventTime} </span> : null}
                        {event.title}
                      </Link>
                    ))}
                    {events.length > limit ? (
                      <p className="text-[10px] text-slate-500">+{events.length - limit} more</p>
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
