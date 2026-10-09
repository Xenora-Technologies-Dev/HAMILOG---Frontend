import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

/** Conditionally render UI actions based on permissions (UX only — API still enforces). */
export function Can({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: string
  anyOf?: string[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { hasPermission, hasAny } = usePermissions()
  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? hasAny(...anyOf)
      : false

  return allowed ? children : fallback
}

export function PermissionGate({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const { hasPermission } = usePermissions()
  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}
