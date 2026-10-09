import { apiGet } from '@/services/apiClient'

export type WhatsAppStatus = {
  enabled: boolean
  configured: boolean
  canSend: boolean
  webhookReady: boolean
  apiVersion: string
  templateReminder: string
  templateDailySummary: string
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
  contactName: string | null
  body: string
  header: string | null
  footer: string | null
  templateName: string | null
  messageType: string
  status: string
  failureReason: string | null
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
