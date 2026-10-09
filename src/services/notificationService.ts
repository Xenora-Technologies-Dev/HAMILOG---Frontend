import { apiGet, apiPost } from '@/services/apiClient'

export type AppNotification = {
  id: string
  title: string
  body: string
  type: string
  unread: boolean
  status: string
  entityType: string | null
  entityId: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationListQuery = {
  page?: number
  pageSize?: number
  unreadOnly?: boolean
  type?: string
  fromDate?: string
  toDate?: string
}

function toQuery(query: NotificationListQuery) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.unreadOnly) params.set('unreadOnly', 'true')
  if (query.type) params.set('type', query.type)
  if (query.fromDate) params.set('fromDate', query.fromDate)
  if (query.toDate) params.set('toDate', query.toDate)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function listNotifications(query: NotificationListQuery = {}) {
  return apiGet<{
    data: AppNotification[]
    pagination: { page: number; pageSize: number; total: number; totalPages: number }
    unreadCount: number
  }>(`/notifications${toQuery(query)}`)
}

export async function getUnreadNotificationCount() {
  return apiGet<{ data: { unreadCount: number } }>('/notifications/unread-count')
}

export async function markNotificationRead(id: string) {
  return apiPost<{ data: AppNotification }>(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  return apiPost<{ updated: number; unreadCount: number }>('/notifications/read-all')
}
