import type { NavIconId } from '@/lib/navigation'

const paths: Record<NavIconId, string> = {
  dashboard:
    'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z',
  enquiries:
    'M7 3h10a2 2 0 0 1 2 2v14l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Zm3 6h4M8 13h8',
  board:
    'M4 5a1 1 0 0 1 1-1h4v16H5a1 1 0 0 1-1-1V5Zm7-1h4v10h-4V4Zm7 0h2a1 1 0 0 1 1 1v7h-3V4Z',
  reminders:
    'M12 4a7 7 0 0 1 7 7c0 4-3 7-7 9-4-2-7-5-7-9a7 7 0 0 1 7-7Zm0 4v4l2.5 1.5',
  calendar:
    'M7 3v2M17 3v2M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h3v3H8v-3Z',
  customers:
    'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M12.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM20 19v-1a3.5 3.5 0 0 0-2.5-3.35M16.5 6.2a3 3 0 0 1 0 4.6',
  staff:
    'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0',
  reports:
    'M4 19V5m0 14h16M8 15v-4m4 4V8m4 7v-6',
  audit:
    'M12 3 4.5 6.5v5.2C4.5 16.7 8 20.2 12 21.5c4-1.3 7.5-4.8 7.5-9.8V6.5L12 3Zm-1 11 4.5-4.5M11 14l-2-2',
  notifications:
    'M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Zm6 10.5a2.5 2.5 0 0 0 2.4-1.8H9.6A2.5 2.5 0 0 0 12 19.5Z',
  whatsapp:
    'M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v6a3.5 3.5 0 0 1-3.5 3.5H12l-3.5 3v-3H8.5A3.5 3.5 0 0 1 5 12.5v-6Z',
  settings:
    'M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5ZM4.5 12.8l1.7.3a6.8 6.8 0 0 0 .7 1.7l-1 1.5 1.8 1.8 1.5-1a6.8 6.8 0 0 0 1.7.7l.3 1.7h2.6l.3-1.7a6.8 6.8 0 0 0 1.7-.7l1.5 1 1.8-1.8-1-1.5a6.8 6.8 0 0 0 .7-1.7l1.7-.3v-2.6l-1.7-.3a6.8 6.8 0 0 0-.7-1.7l1-1.5-1.8-1.8-1.5 1a6.8 6.8 0 0 0-1.7-.7L13.3 3h-2.6l-.3 1.7a6.8 6.8 0 0 0-1.7.7l-1.5-1-1.8 1.8 1 1.5a6.8 6.8 0 0 0-.7 1.7l-1.7.3Z',
}

export function NavIcon({ name, className = 'h-5 w-5' }: { name: NavIconId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function MenuIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  )
}

export function SidebarToggleIcon({ collapsed, className = 'h-5 w-5' }: { collapsed: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 5h16v14H4z" />
      <path d={collapsed ? 'M9 5v14M13 12h5M16 9.5 18.5 12 16 14.5' : 'M9 5v14M8 12H5M6.5 9.5 4 12l2.5 2.5'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BellIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Zm6 10.5a2.5 2.5 0 0 0 2.4-1.8H9.6A2.5 2.5 0 0 0 12 19.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
