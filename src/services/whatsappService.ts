import { apiGet, apiPost } from '@/services/apiClient'

export type WhatsAppStatus = {
  enabled: boolean
  configured: boolean
  canSend: boolean
  webhookReady: boolean
  apiVersion: string
  templateReminder: string
  templateDailySummary: string
  templateEventAssigned?: string
}

export type WhatsAppLogDirection = 'all' | 'inbound' | 'outbound'

export type WhatsAppTemplateVariable = {
  index: number
  name: string
  sample: string
  source: string
}

export type WhatsAppLogItem = {
  id: string
  direction: 'inbound' | 'outbound'
  at: string
  phone: string
  phoneKey: string
  contactName: string | null
  body: string
  header: string | null
  footer: string | null
  templateName: string | null
  messageType: string
  status: string
  failureReason: string | null
  /** Admin "Send test message" row (not part of automated sending). */
  isTest?: boolean
}

export type WhatsAppTemplateDefinition = {
  name: string
  language: string
  category: string
  header: string
  footer: string
  body: string
  previewBody: string
  variables: WhatsAppTemplateVariable[]
  submissionText: string
  sequencePreviews: string[]
  buttons: string[]
}

export type WhatsAppLog = {
  webhook: {
    callbackUrl: string
    verifyMethod: string
    receiveMethod: string
    verifyTokenConfigured: boolean
    verifyTokenEnv: string
    signatureConfigured: boolean
    subscribeField: string
    reachable: boolean
    lastEventAt: string | null
    lastEventStatus: string | null
  }
  template: WhatsAppTemplateDefinition
  assignedTemplate?: WhatsAppTemplateDefinition
  counts: {
    outbound: number
    inbound: number
    failed: number
  }
  messages: WhatsAppLogItem[]
}

export function getWhatsAppStatus() {
  return apiGet<{ data: WhatsAppStatus }>('/whatsapp/status')
}

export function getWhatsAppLog(direction: WhatsAppLogDirection = 'all') {
  const query = direction === 'all' ? '' : `?direction=${direction}`
  return apiGet<{ data: WhatsAppLog }>(`/whatsapp/log${query}`)
}

export type TestSendRecipientOption = {
  id: string
  kind: 'owner' | 'owner-backup' | 'staff'
  name: string
  label: string
}

export type TestSendEventOption = {
  id: string
  title: string
  eventDate: string
  category: string
  priority: string
  status: string
}

export type SenderThrottleInfo = {
  strikes: number
  effectiveStrikes: number
  cooldownUntil: string | null
  lastCode: string | null
  updatedAt: string
}

export type TestSendOptions = {
  recipients: TestSendRecipientOption[]
  events: TestSendEventOption[]
  throttle: SenderThrottleInfo
  templateName: string
  languageCode: string
}

export type TestSendResult = {
  messageId: string
  wamid: string
  messageStatus: string | null
  recipient: string
  templateName: string
  languageCode: string
  sentAt: string
  isTest: true
}

export type TestSendDebug = {
  timestamp: string
  httpStatus: number | null
  code: number | string | null
  subcode: number | null
  type: string | null
  title: string | null
  message: string
  details: string | null
  fbtraceId: string | null
  templateName: string
  languageCode: string
  recipient: string
  recipientLabel: string
  endpoint: string
  requestPayload: Record<string, unknown>
}

export type TestSendStatus = {
  id: string
  wamid: string | null
  status: string
  failureReason: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
  webhookError: Record<string, unknown> | null
}

export function getTestSendOptions(search = '') {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return apiGet<{ data: TestSendOptions }>(`/whatsapp/test-send/options${query}`)
}

export function sendTestMessage(input: { recipientId: string; reminderId: string }) {
  return apiPost<{ data: TestSendResult }>('/whatsapp/test-send', input)
}

export function getTestSendStatus(messageId: string) {
  return apiGet<{ data: TestSendStatus }>(`/whatsapp/test-send/${encodeURIComponent(messageId)}`)
}
