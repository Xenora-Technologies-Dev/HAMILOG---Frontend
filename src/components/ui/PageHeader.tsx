import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string
  description?: string
  breadcrumb?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumb ? <div className="mb-2 text-xs font-medium tracking-wide text-slate-500">{breadcrumb}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
