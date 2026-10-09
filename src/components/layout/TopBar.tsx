import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { BellIcon, MenuIcon, SidebarToggleIcon } from '@/components/icons'
import { getUnreadNotificationCount } from '@/services/notificationService'

export function TopBar({
  title,
  onOpenSidebar,
  sidebarCollapsed,
  onToggleCollapse,
}: {
  title: string
  onOpenSidebar: () => void
  sidebarCollapsed: boolean
  onToggleCollapse: () => void
}) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const refreshUnread = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount()
      setUnread(res.data.unreadCount)
    } catch {
      // Ignore — alerts are best-effort
    }
  }, [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const kickoff = window.setTimeout(() => void refreshUnread(), 0)
    const timer = window.setInterval(() => void refreshUnread(), 60_000)
    return () => {
      window.clearTimeout(kickoff)
      window.clearInterval(timer)
    }
  }, [refreshUnread])

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:inline-flex"
            onClick={onToggleCollapse}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <SidebarToggleIcon collapsed={sidebarCollapsed} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            <p className="truncate text-xs text-slate-500">Trading operations · Asia/Dubai</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label="Notifications"
          >
            <BellIcon />
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm hover:bg-slate-50 sm:px-3"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="hidden sm:block">
                <span className="block text-sm font-medium text-slate-900">{user?.name}</span>
                <span className="block text-xs text-slate-500">{user?.role.name}</span>
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {user?.name?.slice(0, 1).toUpperCase() ?? 'U'}
              </span>
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
              >
                <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
                  <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false)
                    void logout()
                  }}
                >
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
