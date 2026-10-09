const DUBAI_TIME_ZONE = 'Asia/Dubai'

export function formatDubaiDateTime(isoDate: string | Date): string {
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DUBAI_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatDubaiDate(dateOnlyOrIso: string | Date): string {
  if (typeof dateOnlyOrIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOnlyOrIso)) {
    const [y, m, d] = dateOnlyOrIso.split('-').map(Number)
    const utc = new Date(Date.UTC(y!, m! - 1, d!, 8, 0, 0))
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: DUBAI_TIME_ZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(utc)
  }
  return formatDubaiDateTime(dateOnlyOrIso).split(',').slice(0, 1).join('')
}

export function dubaiToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function reminderWindowBucket(
  eventDate: string,
  today = dubaiToday(),
): 'overdue' | 'today' | 'upcoming' {
  if (eventDate < today) return 'overdue'
  if (eventDate === today) return 'today'
  return 'upcoming'
}

export function monthRange(year: number, monthIndex0: number): { from: string; to: string } {
  const from = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
  const to = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export function addMonths(year: number, monthIndex0: number, delta: number) {
  const d = new Date(Date.UTC(year, monthIndex0 + delta, 1))
  return { year: d.getUTCFullYear(), monthIndex0: d.getUTCMonth() }
}
