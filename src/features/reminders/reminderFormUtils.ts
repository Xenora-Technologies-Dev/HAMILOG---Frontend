import { formatDubaiDate } from '@/utils/date'

export type RemindUnit = 'DAYS' | 'WEEKS' | 'MONTHS'

export const REMIND_PRESETS: Array<{ key: string; offsetValue: number; offsetUnit: RemindUnit; label: string }> = [
  { key: '0:DAYS', offsetValue: 0, offsetUnit: 'DAYS', label: 'On the day' },
  { key: '1:DAYS', offsetValue: 1, offsetUnit: 'DAYS', label: '1 day before' },
  { key: '3:DAYS', offsetValue: 3, offsetUnit: 'DAYS', label: '3 days before' },
  { key: '1:WEEKS', offsetValue: 1, offsetUnit: 'WEEKS', label: '1 week before' },
  { key: '2:WEEKS', offsetValue: 2, offsetUnit: 'WEEKS', label: '2 weeks before' },
  { key: '1:MONTHS', offsetValue: 1, offsetUnit: 'MONTHS', label: '1 month before' },
]

export const RECURRENCE_OPTIONS = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'MONTHLY', label: 'Every month' },
  { value: 'YEARLY', label: 'Every year' },
] as const

export function recurrenceLabel(type: string, interval = 1): string {
  const every: Record<string, string> = {
    NONE: 'Does not repeat',
    DAILY: 'Every day',
    WEEKLY: 'Every week',
    MONTHLY: 'Every month',
    YEARLY: 'Every year',
  }
  if (type === 'NONE' || interval <= 1) return every[type] ?? 'Does not repeat'
  const unit: Record<string, string> = {
    DAILY: 'days',
    WEEKLY: 'weeks',
    MONTHLY: 'months',
    YEARLY: 'years',
  }
  return `Every ${interval} ${unit[type] ?? 'times'}`
}

export function remindLabel(offsetValue: number, offsetUnit: string): string {
  const key = remindKey(offsetValue, offsetUnit)
  const preset = REMIND_PRESETS.find((item) => item.key === key)
  if (preset) return preset.label
  if (offsetValue === 0) return 'On the day'
  const singular: Record<string, string> = { DAYS: 'day', WEEKS: 'week', MONTHS: 'month' }
  const word = singular[offsetUnit] ?? 'day'
  return `${offsetValue} ${offsetValue === 1 ? word : `${word}s`} before`
}

/** Map stored offsets onto the form dropdown, including 7 days = 1 week. */
export function remindKey(offsetValue: number, offsetUnit: string): string {
  if (offsetUnit === 'DAYS' && offsetValue === 7) return '1:WEEKS'
  if (offsetUnit === 'DAYS' && offsetValue === 14) return '2:WEEKS'
  return `${offsetValue}:${offsetUnit}`
}

function offsetSpan(offsetValue: number, offsetUnit: string): number {
  if (offsetUnit === 'WEEKS') return offsetValue * 7
  if (offsetUnit === 'MONTHS') return offsetValue * 30
  return offsetValue
}

export function nearestRemindKey(rules: Array<{ offsetValue: number; offsetUnit: string }>): string {
  if (rules.length === 0) return '0:DAYS'
  const nearest = [...rules].sort(
    (a, b) => offsetSpan(a.offsetValue, a.offsetUnit) - offsetSpan(b.offsetValue, b.offsetUnit),
  )[0]!
  return remindKey(nearest.offsetValue, nearest.offsetUnit)
}

export function parseRemindKey(key: string): { offsetValue: number; offsetUnit: RemindUnit } {
  const [rawValue, rawUnit] = key.split(':')
  const offsetUnit: RemindUnit = rawUnit === 'WEEKS' || rawUnit === 'MONTHS' ? rawUnit : 'DAYS'
  const offsetValue = Number(rawValue)
  return { offsetValue: Number.isInteger(offsetValue) && offsetValue >= 0 ? offsetValue : 0, offsetUnit }
}

const OCCURRENCE_STATUS_RANK = ['FAILED', 'MISSED', 'PENDING', 'PROCESSING', 'SENT', 'COMPLETED', 'SKIPPED', 'CANCELLED']

export function occurrenceStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Scheduled'
    case 'PROCESSING':
      return 'Sending'
    case 'SENT':
      return 'Sent'
    case 'COMPLETED':
      return 'Done'
    case 'MISSED':
      return 'Missed'
    case 'FAILED':
      return 'Failed'
    case 'SKIPPED':
      return 'Skipped'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

export type GroupedEventDate = {
  id: string
  eventDate: string
  remindOn: string
  status: string
  pendingIds: string[]
}

/** One row per chosen event date. Reminder days stay on the row, not as extra events. */
export function groupOccurrencesByEvent(
  occurrences: Array<{
    id: string
    eventDate: string
    scheduledFor: string
    status: string
    rule: { offsetValue: number; offsetUnit: string }
  }>,
): GroupedEventDate[] {
  const groups = new Map<string, typeof occurrences>()
  for (const row of occurrences) {
    const list = groups.get(row.eventDate) ?? []
    list.push(row)
    groups.set(row.eventDate, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([eventDate, rows]) => {
      const live = rows.filter((row) => row.status !== 'CANCELLED')
      const visible = live.length > 0 ? live : rows
      const status =
        OCCURRENCE_STATUS_RANK.find((candidate) => visible.some((row) => row.status === candidate)) ??
        visible[0]?.status ??
        'PENDING'
      return {
        id: eventDate,
        eventDate,
        remindOn: [...visible]
          .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
          .map(
            (row) =>
              `${formatDubaiDate(row.scheduledFor)} · ${remindLabel(row.rule.offsetValue, row.rule.offsetUnit)}`,
          )
          .join(', '),
        status,
        pendingIds: rows.filter((row) => row.status === 'PENDING').map((row) => row.id),
      }
    })
}

/** Calendar date arithmetic for YYYY-MM-DD (Dubai business dates). */
export function addDaysToDateOnlyPreview(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`
}

export function priorityTone(priority: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (priority === 'CRITICAL' || priority === 'HIGH') return 'danger'
  if (priority === 'MEDIUM') return 'warning'
  return 'neutral'
}

export function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'COMPLETED' || status === 'SENT') return 'success'
  if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'FAILED' || status === 'MISSED') return 'danger'
  if (status === 'ACTIVE' || status === 'PENDING' || status === 'PROCESSING') return 'warning'
  return 'neutral'
}
