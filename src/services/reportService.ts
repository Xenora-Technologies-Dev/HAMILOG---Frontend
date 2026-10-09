import { apiDownload, apiGet } from '@/services/apiClient'

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'custom'

export type ReportFilters = {
  preset?: DateRangePreset
  fromDate?: string
  toDate?: string
  staffId?: string
  stageCode?: string
  priority?: string
  source?: string
  customerId?: string
  categoryId?: string
}

function toQuery(filters: ReportFilters & Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export type ReportsBundle = {
  timezone: string
  generatedAt: string
  enquiryOverview: {
    range: { preset: string; fromDate: string; toDate: string }
    metrics: {
      total: number
      new: number
      open: number
      completed: number
      lost: number
      cancelled: number
      onHold: number
      overdue: number
    }
  }
  enquiryPipeline: {
    pipeline: Array<{ code: string; name: string; count: number }>
  }
  staffPerformance: {
    staff: Array<{
      staffId: string
      staffName: string
      assigned: number
      open: number
      completed: number
      lost: number
      overdue: number
      averageCompletionHours: number | null
      followUpsToday: number
      followUpsOverdue: number
    }>
  }
  enquirySource: {
    sources: Array<{ source: string; label: string; count: number }>
  }
  priority: {
    priorities: Array<{ priority: string; count: number }>
  }
  reminderOverview: {
    metrics: {
      active: number
      today: number
      upcoming: number
      overdue: number
      completed: number
      cancelled: number
    }
  }
  reminderCategory: {
    categories: Array<{ code: string; name: string; count: number }>
  }
  overdue: {
    enquiries: Array<{
      id: string
      enquiryNumber: string
      title: string
      priority: string
      dueDate: string | null
      assignedTo: { id: string; name: string } | null
    }>
    reminders: Array<{
      id: string
      title: string
      eventDate: string
      priority: string
      owner: { id: string; name: string } | null
    }>
  }
  whatsappDelivery: {
    metrics: {
      queued: number
      sent: number
      delivered: number
      read: number
      failed: number
      total: number
      failureRatePercent: number | null
    }
  } | null
}

export async function getReportsBundle(filters: ReportFilters = {}) {
  return apiGet<{ data: ReportsBundle }>(`/reports${toQuery(filters)}`)
}

export async function downloadReportExport(input: {
  report: string
  format: 'csv' | 'xlsx'
} & ReportFilters) {
  return apiDownload(`/reports/export${toQuery(input)}`)
}

export async function downloadModuleExport(input: Record<string, string | undefined>) {
  return apiDownload(`/reports/export/module${toQuery(input)}`)
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
