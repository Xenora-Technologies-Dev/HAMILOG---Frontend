import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { TopBar } from '@/components/layout/TopBar'
import { titleFromPath } from '@/lib/navigation'

export function AppLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const title = useMemo(() => titleFromPath(location.pathname), [location.pathname])

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 overflow-hidden border-r border-slate-900/40 transition-[width] duration-200 lg:block ${
            collapsed ? 'w-[84px]' : 'w-64'
          }`}
        >
          <SidebarNav collapsed={collapsed} />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
              aria-label="Close navigation overlay"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-hidden bg-slate-950 shadow-2xl">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            title={title}
            onOpenSidebar={() => setMobileOpen(true)}
            sidebarCollapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
          />
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
