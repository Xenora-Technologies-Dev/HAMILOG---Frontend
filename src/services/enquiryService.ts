import { apiDelete, apiDownload, apiGet, apiPatch, apiPost, apiUpload } from '@/services/apiClient'

export type EnquiryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type EnquiryStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'WAITING_SUPPLIER'
  | 'QUOTED'
  | 'WON'
  | 'LOST'
  | 'CANCELLED'
  | 'COMPLETED'

export type EnquirySource =
  | 'PHONE'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'WALK_IN'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'OTHER'

export type EnquiryUserBrief = {
  id: string
  name: string
  email: string
} | null

export type EnquiryStageBrief = {
  id: string
  code: string
  name: string
  sortOrder: number
  isTerminal?: boolean
} | null

export type EnquiryListItem = {
  id: string
  enquiryNumber: string
  title: string
  description: string | null
  priority: EnquiryPriority
  status: EnquiryStatus
  source: EnquirySource
  stage: EnquiryStageBrief
  stageLabel: string | null
  customer: {
    id: string
    companyName: string
    contactName: string | null
    mobile: string | null
    email: string | null
  }
  assignedTo: EnquiryUserBrief
  createdBy: { id: string; name: string; email: string }
  productCategory: string | null
  productName: string | null
  quantity: string | null
  unit: string | null
  brand: string | null
  deliveryLocation: string | null
  dueDate: string | null
  nextActionAt: string | null
  nextActionNote: string | null
  requiredDeliveryDate: string | null
  isOverdue: boolean
  createdAt: string
  updatedAt: string
}

export type EnquiryDetail = EnquiryListItem & {
  contactPerson: string | null
  contactMobile: string | null
  contactEmail: string | null
  specification: string | null
  sizeDimension: string | null
  lostReason: string | null
  cancelledReason: string | null
  onHoldReason: string | null
  completedAt: string | null
  completedBy: EnquiryUserBrief
  lostAt: string | null
  cancelledAt: string | null
  onHoldAt: string | null
  reopenedAt: string | null
  reopenedBy: EnquiryUserBrief
  reopenReason: string | null
  assignments: Array<{
    id: string
    assignee: { id: string; name: string; email: string }
    assignedBy: EnquiryUserBrief
    note: string | null
    assignedAt: string
    unassignedAt: string | null
    isCurrent: boolean
  }>
  comments: Array<{
    id: string
    body: string
    isInternal: boolean
    author: { id: string; name: string; email: string }
    createdAt: string
    editedAt?: string | null
    isEdited?: boolean
  }>
  stageHistory: Array<{
    id: string
    fromStageCode: string | null
    toStageCode: string
    fromStatus: EnquiryStatus | null
    toStatus: EnquiryStatus | null
    reason: string | null
    changedAt: string
    changedBy: { id: string; name: string; email: string }
  }>
  lastActivityAt?: string | null
  lastActivitySummary?: string | null
  attachments?: Array<{
    id: string
    fileName: string
    originalName: string
    mimeType: string
    sizeBytes: number
    uploadedBy: { id: string; name: string; email: string }
    uploadedAt: string
  }>
  counts: {
    comments: number
    activities: number
    linkedReminders: number
    attachments?: number
  }
}

export type EnquiryStage = {
  id: string
  code: string
  name: string
  description: string | null
  sortOrder: number
  isInitial: boolean
  isTerminal: boolean
  mapsToStatus: EnquiryStatus | null
}

export type BoardColumn = {
  key: string
  label: string
  stageCodes: string[]
  items: EnquiryListItem[]
}

export type EnquiryListResponse = {
  data: EnquiryListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type CreateEnquiryPayload = {
  customerId: string
  title: string
  description?: string
  priority?: EnquiryPriority
  source?: EnquirySource
  contactPerson?: string
  contactMobile?: string
  contactEmail?: string
  assignedToId?: string
  dueDate?: string
  nextActionAt?: string
  nextActionNote?: string
  productCategory?: string
  productName?: string
  quantity?: string
  unit?: string
  specification?: string
  sizeDimension?: string
  brand?: string
  deliveryLocation?: string
  requiredDeliveryDate?: string
}

export type UpdateEnquiryPayload = Partial<
  Omit<CreateEnquiryPayload, 'customerId' | 'assignedToId'>
> & {
  description?: string | null
  contactPerson?: string | null
  contactMobile?: string | null
  contactEmail?: string | null
  dueDate?: string | null
  nextActionAt?: string | null
  nextActionNote?: string | null
  productCategory?: string | null
  productName?: string | null
  quantity?: string | null
  unit?: string | null
  specification?: string | null
  sizeDimension?: string | null
  brand?: string | null
  deliveryLocation?: string | null
  requiredDeliveryDate?: string | null
}

export type EnquiryListParams = {
  page?: number
  pageSize?: number
  search?: string
  enquiryNumber?: string
  status?: EnquiryStatus | ''
  stageCode?: string
  priority?: EnquiryPriority | ''
  assignedToId?: string
  customerId?: string
  source?: EnquirySource | ''
  productName?: string
  overdue?: boolean
  fromDate?: string
  toDate?: string
  dueFrom?: string
  dueTo?: string
  nextFollowUpFrom?: string
  nextFollowUpTo?: string
  sort?: string
}

function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, String(value))
  }
  return query.toString()
}

export function listEnquiries(params: EnquiryListParams) {
  const qs = toQuery(params)
  return apiGet<EnquiryListResponse>(`/enquiries${qs ? `?${qs}` : ''}`)
}

export function getEnquiryBoard(params: {
  assignedToId?: string
  customerId?: string
  priority?: EnquiryPriority | ''
  stageCode?: string
  overdue?: boolean
  search?: string
  includeTerminal?: boolean
}) {
  const qs = toQuery(params)
  return apiGet<{
    data: {
      columns: BoardColumn[]
      ungrouped: EnquiryListItem[]
      total: number
    }
  }>(`/enquiries/board${qs ? `?${qs}` : ''}`)
}

export function listEnquiryStages() {
  return apiGet<{
    data: EnquiryStage[]
    boardColumns: Array<{ key: string; label: string; stageCodes: string[] }>
  }>('/enquiries/stages')
}

export function getEnquiry(id: string) {
  return apiGet<{ data: EnquiryDetail }>(`/enquiries/${id}`)
}

export function createEnquiry(payload: CreateEnquiryPayload) {
  return apiPost<{ data: EnquiryDetail }>('/enquiries', payload)
}

export function updateEnquiry(id: string, payload: UpdateEnquiryPayload) {
  return apiPatch<{ data: EnquiryDetail }>(`/enquiries/${id}`, payload)
}

export function assignEnquiry(id: string, payload: { assigneeId: string; reason?: string; note?: string }) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/assign`, payload)
}

export function unassignEnquiry(id: string, payload?: { reason?: string }) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/unassign`, payload ?? {})
}

export function changeEnquiryStage(
  id: string,
  payload: {
    stageCode: string
    reason?: string
    nextActionAt?: string
    nextActionNote?: string
  },
) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/stage`, payload)
}

export function completeEnquiry(id: string, payload: { note: string }) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/complete`, payload)
}

export function markEnquiryLost(id: string, payload: { reason: string }) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/lost`, payload)
}

export function cancelEnquiry(id: string, payload: { reason: string }) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/cancel`, payload)
}

export function holdEnquiry(
  id: string,
  payload?: { reason?: string; nextActionAt?: string; nextActionNote?: string },
) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/hold`, payload ?? {})
}

export function reopenEnquiry(id: string, payload: { reason: string; stageCode?: string }) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/reopen`, payload)
}

export type FollowUpPayload = {
  activityType?:
    | 'CUSTOMER_CALL'
    | 'CUSTOMER_WHATSAPP'
    | 'CUSTOMER_EMAIL'
    | 'CUSTOMER_MEETING'
    | 'SUPPLIER_CONTACT'
    | 'QUOTATION_SENT'
    | 'INTERNAL_NOTE'
    | 'FOLLOW_UP'
    | 'OTHER'
  occurredAt?: string
  contactPerson?: string
  outcome: string
  comment?: string
  nextAction: string
  nextActionAt: string
}

export function addEnquiryFollowUp(id: string, payload: FollowUpPayload) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/follow-ups`, payload)
}

export function addEnquiryActivity(
  id: string,
  payload: {
    activityType: FollowUpPayload['activityType']
    occurredAt?: string
    contactPerson?: string
    outcome?: string
    comment?: string
    subject?: string
    nextAction?: string
    nextActionAt?: string
  },
) {
  return apiPost<{ data: EnquiryDetail }>(`/enquiries/${id}/activities`, payload)
}

export type TimelineItem = {
  id: string
  type: string
  subject: string | null
  body: string | null
  fromStatus: EnquiryStatus | null
  toStatus: EnquiryStatus | null
  occurredAt: string
  createdAt: string
  performedBy: { id: string; name: string; email: string }
  metadata: unknown
}

export function getEnquiryTimeline(id: string, params?: { page?: number; pageSize?: number }) {
  const qs = toQuery(params ?? {})
  return apiGet<{
    data: TimelineItem[]
    meta: { page: number; pageSize: number; total: number; totalPages: number }
  }>(`/enquiries/${id}/timeline${qs ? `?${qs}` : ''}`)
}

export function addEnquiryComment(id: string, payload: { body: string; isInternal?: boolean }) {
  return apiPost<{
    data: {
      id: string
      body: string
      isInternal: boolean
      author: { id: string; name: string; email: string }
      createdAt: string
      editedAt?: string | null
      isEdited?: boolean
    }
  }>(`/enquiries/${id}/comments`, payload)
}

export function updateEnquiryComment(id: string, commentId: string, payload: { body: string }) {
  return apiPatch<{
    data: {
      id: string
      body: string
      isInternal: boolean
      author: { id: string; name: string; email: string }
      createdAt: string
      editedAt?: string | null
      isEdited?: boolean
    }
  }>(`/enquiries/${id}/comments/${commentId}`, payload)
}

export function uploadEnquiryAttachment(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiUpload<{
    data: {
      id: string
      fileName: string
      originalName: string
      mimeType: string
      sizeBytes: number
      uploadedBy: { id: string; name: string; email: string }
      uploadedAt: string
    }
  }>(`/enquiries/${id}/attachments`, form)
}

export function downloadEnquiryAttachment(id: string, attachmentId: string) {
  return apiDownload(`/enquiries/${id}/attachments/${attachmentId}/download`)
}

export function deleteEnquiryAttachment(id: string, attachmentId: string) {
  return apiDelete<{ data: { id: string; deleted: boolean } }>(
    `/enquiries/${id}/attachments/${attachmentId}`,
  )
}

export function createEnquiryLinkedReminder(
  id: string,
  payload: { eventDate: string; title?: string; notes?: string; categoryId?: string; ownerUserId?: string },
) {
  return apiPost<{
    data: { id: string; title: string; eventDate: string; linkedEnquiryId: string }
  }>(`/enquiries/${id}/reminders`, payload)
}

export function getEnquiryStageHistory(id: string) {
  return apiGet<{ data: EnquiryDetail['stageHistory'] }>(`/enquiries/${id}/stage-history`)
}
