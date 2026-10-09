import type { EnquiryPriority, EnquirySource, EnquiryStatus } from '@/services/enquiryService'

export const PRIORITY_OPTIONS: Array<{ value: EnquiryPriority; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export const SOURCE_OPTIONS: Array<{ value: EnquirySource; label: string }> = [
  { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTHER', label: 'Other' },
]

export const STATUS_OPTIONS: Array<{ value: EnquiryStatus; label: string }> = [
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING_CUSTOMER', label: 'Waiting customer' },
  { value: 'WAITING_SUPPLIER', label: 'Waiting supplier' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'WON', label: 'Won' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'LOST', label: 'Lost' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function priorityTone(priority: string): 'neutral' | 'success' | 'warning' | 'danger' {
  switch (priority) {
    case 'URGENT':
      return 'danger'
    case 'HIGH':
      return 'warning'
    case 'LOW':
      return 'neutral'
    default:
      return 'success'
  }
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return 'Urgent · P1'
    case 'HIGH':
      return 'High · P2'
    case 'MEDIUM':
      return 'Medium · P3'
    case 'LOW':
      return 'Low · P4'
    default:
      return priority
  }
}

export function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'COMPLETED':
    case 'WON':
      return 'success'
    case 'LOST':
    case 'CANCELLED':
      return 'danger'
    case 'NEW':
    case 'ASSIGNED':
      return 'warning'
    default:
      return 'neutral'
  }
}

/** Ordinary stage codes selectable from dropdown (excludes terminal/special). */
export const ORDINARY_STAGE_CODES = [
  'NEW',
  'ASSIGNED',
  'CONTACTED',
  'REQUIREMENT_CONFIRMED',
  'SUPPLIER_SEARCH',
  'QUOTATION_PREPARING',
  'QUOTATION_SENT',
  'NEGOTIATION',
  'WAITING_FOR_CUSTOMER',
  'CONFIRMED',
] as const
