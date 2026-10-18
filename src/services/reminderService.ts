import { apiGet, apiPatch, apiPost } from '@/services/apiClient'

export type ReminderCategory = {
  id: string
  code: string
  name: string
  description?: string | null
}

export type ReminderUserRef = {
  id: string
  name: string
  email: string
  isActive?: boolean
  deactivatedAt?: string | null
}

export type ReminderRule = {
  id: string
  offsetValue: number
  offsetUnit: 'DAYS' | 'WEEKS' | 'MONTHS'
  sendTimeLocal: string
  channel: string
  label: string | null
  isActive: boolean
}

export type ReminderRecipient = {
  id: string
  recipientType: string
  isPrimary: boolean
  user: ReminderUserRef | null
}

export type Reminder = {
  id: string
  title: string
  description: string | null
  category: { id: string; code: string; name: string }
  eventDate: string
  eventTime: string | null
  timezone: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: string
  recurrenceType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  recurrenceInterval: number
  recurrenceUntil: string | null
  personName: string | null
  referenceCode: string | null
  notes: string | null
  ownerUser: ReminderUserRef | null
  createdBy: ReminderUserRef
  rules: ReminderRule[]
  recipients: ReminderRecipient[]
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export type ReminderOccurrence = {
  id: string
  eventDate: string
  scheduledFor: string
  status: string
  completedAt: string | null
  cancelledAt: string | null
  rule: {
    id: string
    offsetValue: number
    offsetUnit: string
    sendTimeLocal: string
    label: string | null
  }
}

export type ReminderDetail = Reminder & {
  occurrences: ReminderOccurrence[]
  plannedPreview: Array<{
    ruleId: string
    eventDate: string
    scheduledFor: string
    idempotencyKey: string
  }>
  auditTrail: Array<{
    id: string
    action: string
    createdAt: string
    actorName: string
    metadata: unknown
    oldValues: unknown
    newValues: unknown
  }>
  notificationHistory: Array<{
    id: string
    messageType: string
    status: string
    templateName: string | null
    recipientName: string | null
    recipientPhoneMasked: string
    providerMessageId: string | null
    sentAt: string | null
    deliveredAt: string | null
    readAt: string | null
    failedAt: string | null
    failureReason: string | null
    createdAt: string
    forDate: string | null
    isTest: boolean
  }>
}

export type ReminderListResponse = {
  data: Reminder[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ReminderRuleInput = {
  offsetValue: number
  offsetUnit?: 'DAYS' | 'WEEKS' | 'MONTHS'
  sendTimeLocal?: string
  channel?: string
  label?: string
  isActive?: boolean
}

export type ReminderPayload = {
  title: string
  description?: string
  categoryId: string
  eventDate: string
  eventTimeLocal?: string
  priority?: Reminder['priority']
  recurrenceType?: Reminder['recurrenceType']
  recurrenceInterval?: number
  recurrenceUntil?: string | null
  personName?: string | null
  referenceCode?: string | null
  notes?: string | null
  ownerUserId?: string | null
  recipientUserIds?: string[]
  rules: ReminderRuleInput[]
  sendNow?: boolean
}

export type ReminderSendNowResult = {
  attempted: boolean
  sent: number
  failed: number
  results: Array<{
    recipientUserId: string | null
    recipientName: string
    success: boolean
    alreadySent?: boolean
    disabled?: boolean
    errorMessage?: string
  }>
}

export type ReminderListParams = {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  categoryId?: string
  priority?: string
  recipientUserId?: string
  fromDate?: string
  toDate?: string
  window?: 'overdue' | 'today' | 'upcoming'
  completed?: boolean
  recurring?: boolean
  sort?: 'eventDate_asc' | 'eventDate_desc' | 'createdAt_desc'
}

export type CalendarReminder = {
  id: string
  title: string
  eventDate: string
  eventTime: string | null
  priority: string
  status: string
  personName: string | null
  categoryName: string
}

function toQuery(params: ReminderListParams) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.categoryId) query.set('categoryId', params.categoryId)
  if (params.priority) query.set('priority', params.priority)
  if (params.recipientUserId) query.set('recipientUserId', params.recipientUserId)
  if (params.fromDate) query.set('fromDate', params.fromDate)
  if (params.toDate) query.set('toDate', params.toDate)
  if (params.window) query.set('window', params.window)
  if (params.completed !== undefined) query.set('completed', String(params.completed))
  if (params.recurring !== undefined) query.set('recurring', String(params.recurring))
  if (params.sort) query.set('sort', params.sort)
  return query.toString()
}

export function listReminders(params: ReminderListParams = {}) {
  const qs = toQuery(params)
  return apiGet<ReminderListResponse>(`/reminders${qs ? `?${qs}` : ''}`)
}

export function getReminder(id: string) {
  return apiGet<{ data: ReminderDetail }>(`/reminders/${id}`)
}

export function createReminder(payload: ReminderPayload) {
  return apiPost<{ data: Reminder; sendNow?: ReminderSendNowResult | null }>('/reminders', payload)
}

export function updateReminder(id: string, payload: Partial<ReminderPayload>) {
  return apiPatch<{ data: Reminder }>(`/reminders/${id}`, payload)
}

export function completeReminder(id: string) {
  return apiPost<{ data: Reminder }>(`/reminders/${id}/complete`)
}

export function cancelReminder(id: string) {
  return apiPost<{ data: Reminder }>(`/reminders/${id}/cancel`)
}

export function listReminderCategories() {
  return apiGet<{ data: ReminderCategory[] }>('/reminders/categories')
}

export function listReminderOccurrences(id: string) {
  return apiGet<{ data: ReminderOccurrence[] }>(`/reminders/${id}/occurrences`)
}

export function completeOccurrence(occurrenceId: string) {
  return apiPost<{ data: ReminderOccurrence }>(`/reminders/occurrences/${occurrenceId}/complete`)
}

export function getReminderCalendar(from: string, to: string) {
  return apiGet<{ data: CalendarReminder[] }>(`/reminders/calendar?from=${from}&to=${to}`)
}
