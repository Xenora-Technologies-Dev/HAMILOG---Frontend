import { apiGet, apiPatch, apiPost } from '@/services/apiClient'

export type StaffRole = {
  id: string
  code: string
  name: string
  description?: string | null
}

export type StaffMember = {
  id: string
  name: string
  email: string
  username: string
  mobile: string | null
  whatsappNumber: string | null
  isActive: boolean
  isAssignable: boolean
  isDevelopmentUser: boolean
  role: StaffRole
  lastLoginAt: string | null
  deactivatedAt: string | null
  createdAt: string
  updatedAt: string
}

export type StaffListResponse = {
  data: StaffMember[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type StaffDetail = StaffMember & {
  placeholders: {
    assignedEnquiries: unknown[]
    assignedReminders: unknown[]
    recentActivity: unknown[]
  }
}

export type CreateStaffPayload = {
  name: string
  email: string
  username?: string
  mobile?: string
  whatsappNumber?: string
  roleId: string
  temporaryPassword: string
  isActive?: boolean
}

export type UpdateStaffPayload = {
  name?: string
  mobile?: string | null
  whatsappNumber?: string | null
  roleId?: string
  isActive?: boolean
}

export function listStaff(params: {
  page?: number
  pageSize?: number
  search?: string
  roleCode?: string
  isActive?: boolean
}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.roleCode) query.set('roleCode', params.roleCode)
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive))
  const qs = query.toString()
  return apiGet<StaffListResponse>(`/staff${qs ? `?${qs}` : ''}`)
}

export function getStaff(id: string) {
  return apiGet<{ data: StaffDetail }>(`/staff/${id}`)
}

export function listStaffRoles() {
  return apiGet<{ data: StaffRole[] }>('/staff/roles')
}

export function createStaff(payload: CreateStaffPayload) {
  return apiPost<{ data: StaffMember }>('/staff', payload)
}

export function updateStaff(id: string, payload: UpdateStaffPayload) {
  return apiPatch<{ data: StaffMember }>(`/staff/${id}`, payload)
}

export function deactivateStaff(id: string) {
  return apiPost<{ data: StaffMember }>(`/staff/${id}/deactivate`)
}

export function activateStaff(id: string) {
  return apiPost<{ data: StaffMember }>(`/staff/${id}/activate`)
}
