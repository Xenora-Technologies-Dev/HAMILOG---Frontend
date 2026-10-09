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
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'danger'
  if (status === 'ACTIVE') return 'warning'
  return 'neutral'
}
