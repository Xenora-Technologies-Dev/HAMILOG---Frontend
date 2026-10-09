import { useAuth } from '@/features/auth/useAuth'

export function usePermissions() {
  const { user, hasPermission, can, status } = useAuth()

  return {
    status,
    roleCode: user?.role.code ?? null,
    permissions: user?.permissions ?? [],
    hasPermission,
    can,
    hasAny: (...codes: string[]) => codes.some((code) => hasPermission(code)),
    hasAll: (...codes: string[]) => codes.every((code) => hasPermission(code)),
  }
}
