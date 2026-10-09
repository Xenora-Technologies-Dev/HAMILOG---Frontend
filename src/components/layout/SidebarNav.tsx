import { Link, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { NavIcon } from '@/components/icons'
import { APP_NAV_SECTIONS, isNavItemActive } from '@/lib/navigation'
import { usePermissions } from '@/hooks/usePermissions'

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const { hasPermission, hasAny } = usePermissions()
  const location = useLocation()

  const sections = APP_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.permission) return hasPermission(item.permission)
      if (item.anyOf) return hasAny(...item.anyOf)
      return true
    }),
  })).filter((section) => section.items.length > 0)

  const visibleItems = sections.flatMap((section) => section.items)

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className={`border-b border-white/10 ${collapsed ? 'px-3 py-4' : 'px-4 py-4'}`}>
        <div className="rounded-xl bg-white px-2.5 py-2">
          <BrandLogo size="sm" showName={!collapsed} nameClassName="text-sm" />
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Primary">
        {sections.map((section, sectionIndex) => (
          <div key={section.id}>
            {collapsed ? (
              sectionIndex > 0 ? <div className="mb-2 h-px bg-white/10" aria-hidden="true" /> : null
            ) : (
              <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isNavItemActive(location.pathname, item.to, visibleItems)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? (item.title ?? item.label) : undefined}
                    className={[
                      'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition',
                      collapsed ? 'justify-center px-0' : '',
                      active
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                    ].join(' ')}
                    onClick={onNavigate}
                  >
                    <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                    {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}
