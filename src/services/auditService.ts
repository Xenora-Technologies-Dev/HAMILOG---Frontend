import { apiGet } from '@/services/apiClient'

export type AuditListItem = {
  id: string
  createdAt: string
  user: { id: string; name: string; email: string } | null
  action: string
  event: string
  entityType: string
  entityId: string | null
  summary: string
  ipAddress: string | null
}

export type AuditDetail = AuditListItem & {
  userAgent: string | null
  oldValues: unknown
  newValues: unknown
  metadata: unknown
}

export type AuditListQuery = {
  page?: number
  pageSize?: number
  search?: string
  userId?: string
  action?: string
  event?: string
  entityType?: string
  entityId?: string
  fromDate?: string
  toDate?: string
  preset?: string
}

function toQuery(query: AuditListQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function listAuditLogs(query: AuditListQuery = {}) {
  return apiGet<{
    data: AuditListItem[]
    pagination: { page: number; pageSize: number; total: number; totalPages: number }
    retention: { autoDeleteEnabled: boolean; defaultPolicy: string; note: string }
  }>(`/audit${toQuery(query)}`)
}

export async function getAuditDetail(id: string) {
  return apiGet<{ data: AuditDetail }>(`/audit/${id}`)
}
