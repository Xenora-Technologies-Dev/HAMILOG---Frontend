import type { ReactNode } from 'react'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    warning: 'bg-amber-50 text-amber-800 ring-amber-100',
    danger: 'bg-rose-50 text-rose-800 ring-rose-100',
    info: 'bg-sky-50 text-sky-800 ring-sky-100',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
