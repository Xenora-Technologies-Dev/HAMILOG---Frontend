import type { ReactNode } from 'react'

export function Card({
  title,
  description,
  children,
  actions,
  className = '',
  padded = true,
}: {
  title?: string
  description?: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title ? <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? 'px-5 py-4' : ''}>{children}</div>
    </section>
  )
}
