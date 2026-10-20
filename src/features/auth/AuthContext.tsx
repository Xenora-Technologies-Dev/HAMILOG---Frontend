import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '@/services/apiClient'
import * as authService from '@/services/authService'
import type { AuthUser } from '@/types/auth'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  hasPermission: (permission: string) => boolean
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)

  const refresh = useCallback(async () => {
    try {
      const result = await authService.getCurrentUser()
      setUser(result.user)
      setStatus('authenticated')
    } catch (error) {
      setUser(null)
      setStatus('unauthenticated')
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error(error)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await authService.getCurrentUser()
          if (cancelled) return
          setUser(result.user)
          setStatus('authenticated')
        } catch (error) {
          if (cancelled) return
          setUser(null)
          setStatus('unauthenticated')
          if (!(error instanceof ApiError && error.status === 401)) {
            console.error(error)
          }
        }
      })()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password)
    // The password was accepted, but the session only works if the browser kept the
    // cookie. Confirm with /auth/me instead of trusting the login response, so a
    // blocked cookie (e.g. iPhone Safari) shows an error rather than a fake login.
    let verified: Awaited<ReturnType<typeof authService.getCurrentUser>>
    try {
      verified = await authService.getCurrentUser()
    } catch (error) {
      setUser(null)
      setStatus('unauthenticated')
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(401, {
          error: {
            code: 'SESSION_COOKIE_BLOCKED',
            message:
              'Your password was accepted, but your browser blocked the login session. ' +
              'Turn off "Block All Cookies" / "Prevent Cross-Site Tracking" or try another browser, then sign in again.',
          },
        })
      }
      throw error
    }
    setUser(verified.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false
      if (user.role.code === 'SUPER_ADMIN') return true
      return user.permissions.includes(permission)
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      logout,
      refresh,
      hasPermission,
      can: hasPermission,
    }),
    [status, user, login, logout, refresh, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
