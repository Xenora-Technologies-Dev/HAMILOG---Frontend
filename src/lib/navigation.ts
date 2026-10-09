export type NavIconId =
  | 'dashboard'
  | 'enquiries'
  | 'board'
  | 'reminders'
  | 'calendar'
  | 'customers'
  | 'staff'
  | 'reports'
  | 'audit'
  | 'notifications'
  | 'whatsapp'
  | 'settings'

export type NavItem = {
  to: string
  label: string
  title?: string
  icon: NavIconId
  permission?: string
  anyOf?: string[]
}

export type NavSection = {
  id: string
  label: string
  items: NavItem[]
}

export const APP_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard.view' }],
  },
  {
    id: 'enquiries',
    label: 'Enquiries',
    items: [
      { to: '/enquiries', label: 'List', title: 'Enquiries', icon: 'enquiries', permission: 'enquiries.view' },
      {
        to: '/enquiries/board',
        label: 'Board',
        title: 'Enquiry board',
        icon: 'board',
        permission: 'enquiries.view',
      },
    ],
  },
  {
    id: 'reminders',
    label: 'Reminders',
    items: [
      { to: '/reminders', label: 'List', title: 'Reminders', icon: 'reminders', permission: 'reminders.view' },
      {
        to: '/reminders/calendar',
        label: 'Calendar',
        title: 'Calendar',
        icon: 'calendar',
        permission: 'reminders.view',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { to: '/customers', label: 'Customers', icon: 'customers', permission: 'customers.view' },
      { to: '/staff', label: 'Staff', icon: 'staff', permission: 'users.view' },
      { to: '/reports', label: 'Reports', icon: 'reports', permission: 'reports.view' },
      { to: '/audit', label: 'Audit', icon: 'audit', permission: 'audit.view' },
      { to: '/notifications', label: 'Notifications', icon: 'notifications', anyOf: ['dashboard.view'] },
      {
        to: '/whatsapp',
        label: 'WhatsApp log',
        title: 'WhatsApp log',
        icon: 'whatsapp',
        permission: 'whatsapp.view',
      },
      { to: '/settings', label: 'Settings', icon: 'settings', permission: 'settings.view' },
    ],
  },
]

export const APP_NAV_ITEMS: NavItem[] = APP_NAV_SECTIONS.flatMap((section) => section.items)

export function navItemMatchesPath(itemTo: string, pathname: string): boolean {
  if (itemTo === '/') return pathname === '/'
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`)
}

/** Longest matching path wins so only one nav item is active. */
export function resolveActiveNavTo(pathname: string, items: Pick<NavItem, 'to'>[]): string | null {
  const matches = items.filter((item) => navItemMatchesPath(item.to, pathname))
  if (matches.length === 0) return null
  return matches.reduce((best, item) => (item.to.length > best.to.length ? item : best)).to
}

export function isNavItemActive(
  pathname: string,
  itemTo: string,
  items: Pick<NavItem, 'to'>[],
): boolean {
  return resolveActiveNavTo(pathname, items) === itemTo
}

export function titleFromPath(pathname: string): string {
  const activeTo = resolveActiveNavTo(pathname, APP_NAV_ITEMS)
  const match = APP_NAV_ITEMS.find((item) => item.to === activeTo)
  if (match) return match.title ?? match.label
  if (pathname.startsWith('/staff')) return 'Staff'
  if (pathname.startsWith('/customers')) return 'Customers'
  if (pathname === '/unauthorized') return 'Access denied'
  return 'Workspace'
}
