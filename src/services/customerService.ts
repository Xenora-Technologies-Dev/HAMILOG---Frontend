import { apiGet, apiPatch, apiPost, ApiError } from '@/services/apiClient'

export type CustomerType =
  | 'COMPANY'
  | 'INDIVIDUAL'
  | 'EXISTING_CUSTOMER'
  | 'SUPPLIER_CUSTOMER'
  | 'OTHER'

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  COMPANY: 'Company',
  INDIVIDUAL: 'Individual',
  EXISTING_CUSTOMER: 'Existing Customer',
  SUPPLIER_CUSTOMER: 'Supplier/Customer',
  OTHER: 'Other',
}

export type CustomerContact = {
  id: string
  role: 'MAIN' | 'SALES' | 'PURCHASE' | 'ACCOUNTS' | 'OTHER'
  name: string
  mobile: string | null
  whatsappNumber: string | null
  email: string | null
  isPrimary: boolean
  notes: string | null
  isActive: boolean
}

export type CustomerCreatedBy = {
  id: string
  name: string
  email: string
} | null

export type CustomerListItem = {
  id: string
  companyName: string
  customerType: CustomerType
  contactName: string | null
  mobile: string | null
  whatsappNumber: string | null
  email: string | null
  address: string | null
  addressLine2: string | null
  city: string | null
  emirate: string | null
  country: string
  tradeLicenceNo: string | null
  notes: string | null
  isActive: boolean
  deactivatedAt: string | null
  createdBy: CustomerCreatedBy
  enquiryCount: number
  lastEnquiryAt: string | null
  lastEnquiryNumber: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerDetail = Omit<
  CustomerListItem,
  'enquiryCount' | 'lastEnquiryAt' | 'lastEnquiryNumber'
> & {
  enquiryCount: number
  contacts: CustomerContact[]
}

export type CustomerLookupItem = {
  id: string
  companyName: string
  customerType: CustomerType
  contactName: string | null
  mobile: string | null
  whatsappNumber: string | null
  email: string | null
  city: string | null
  country: string
  isActive: boolean
}

export type CustomerEnquiryHistoryItem = {
  id: string
  enquiryNumber: string
  title: string
  stage: string
  stageCode: string | null
  priority: string
  status: string
  assignedStaff: { id: string; name: string; email: string } | null
  createdAt: string
  updatedAt: string
}

export type CustomerDuplicateMatch = {
  id: string
  companyName: string
  contactName: string | null
  mobile: string | null
  email: string | null
  isActive: boolean
  reason: 'COMPANY_AND_MOBILE' | 'MOBILE' | 'EMAIL'
}

export type CustomerListResponse = {
  data: CustomerListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type CreateCustomerPayload = {
  companyName: string
  customerType?: CustomerType
  contactName?: string
  mobile?: string
  whatsappNumber?: string
  email?: string
  address?: string
  addressLine2?: string
  city?: string
  emirate?: string
  country?: string
  tradeLicenceNo?: string
  notes?: string
  isActive?: boolean
  acknowledgeDuplicates?: boolean
}

export type UpdateCustomerPayload = {
  companyName?: string
  customerType?: CustomerType
  contactName?: string | null
  mobile?: string | null
  whatsappNumber?: string | null
  email?: string | null
  address?: string | null
  addressLine2?: string | null
  city?: string | null
  emirate?: string | null
  country?: string
  tradeLicenceNo?: string | null
  notes?: string | null
  isActive?: boolean
  acknowledgeDuplicates?: boolean
}

export function listCustomers(params: {
  page?: number
  pageSize?: number
  search?: string
  city?: string
  country?: string
  customerType?: CustomerType | ''
  isActive?: boolean
}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.city) query.set('city', params.city)
  if (params.country) query.set('country', params.country)
  if (params.customerType) query.set('customerType', params.customerType)
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive))
  const qs = query.toString()
  return apiGet<CustomerListResponse>(`/customers${qs ? `?${qs}` : ''}`)
}

export function getCustomer(id: string) {
  return apiGet<{ data: CustomerDetail }>(`/customers/${id}`)
}

export function getCustomerEnquiries(
  id: string,
  params?: { page?: number; pageSize?: number },
) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  const qs = query.toString()
  return apiGet<{
    data: CustomerEnquiryHistoryItem[]
    pagination: CustomerListResponse['pagination']
  }>(`/customers/${id}/enquiries${qs ? `?${qs}` : ''}`)
}

export function lookupCustomers(params: {
  search: string
  limit?: number
  includeInactive?: boolean
}) {
  const query = new URLSearchParams()
  query.set('search', params.search)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.includeInactive) query.set('includeInactive', 'true')
  return apiGet<{ data: CustomerLookupItem[] }>(`/customers/lookup?${query.toString()}`)
}

export function checkCustomerDuplicates(payload: {
  companyName?: string
  mobile?: string
  email?: string
  excludeCustomerId?: string
}) {
  return apiPost<{
    data: { hasDuplicates: boolean; matches: CustomerDuplicateMatch[] }
  }>('/customers/check-duplicates', payload)
}

export function createCustomer(payload: CreateCustomerPayload) {
  return apiPost<{ data: CustomerDetail; duplicateWarnings: CustomerDuplicateMatch[] }>(
    '/customers',
    payload,
  )
}

export function updateCustomer(id: string, payload: UpdateCustomerPayload) {
  return apiPatch<{ data: CustomerDetail; duplicateWarnings: CustomerDuplicateMatch[] }>(
    `/customers/${id}`,
    payload,
  )
}

export function deactivateCustomer(id: string) {
  return apiPost<{ data: CustomerDetail }>(`/customers/${id}/deactivate`)
}

export function activateCustomer(id: string) {
  return apiPost<{ data: CustomerDetail }>(`/customers/${id}/activate`)
}

export function getDuplicateMatchesFromError(error: unknown): CustomerDuplicateMatch[] | null {
  if (!(error instanceof ApiError) || error.code !== 'DUPLICATE_WARNING') {
    return null
  }
  const details = error.details as { matches?: CustomerDuplicateMatch[] } | undefined
  return details?.matches ?? null
}
