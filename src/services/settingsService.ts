import { apiGet, apiPut } from '@/services/apiClient'

export type WhatsAppOwner = {
  name: string
  phone: string | null
  /** Gets the owner's reminder when the main number fails or is rate limited. */
  backupPhone: string | null
}

export function getWhatsAppOwner() {
  return apiGet<{ data: WhatsAppOwner }>('/settings/whatsapp-owner')
}

export function saveWhatsAppOwner(input: { name: string; phone: string; backupPhone: string }) {
  return apiPut<{ data: WhatsAppOwner }>('/settings/whatsapp-owner', input)
}
