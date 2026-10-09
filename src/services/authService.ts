import { apiGet, apiPost } from '@/services/apiClient'
import type { AuthMeResponse, AuthUser } from '@/types/auth'

export function login(email: string, password: string) {
  return apiPost<AuthMeResponse>('/auth/login', { email, password })
}

export function logout() {
  return apiPost<void>('/auth/logout')
}

export function getCurrentUser() {
  return apiGet<AuthMeResponse>('/auth/me')
}

export type { AuthUser }
