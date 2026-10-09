import type { ReactNode } from 'react'

export function FilterBar({
  children,
  actions,
}: {
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
      {actions ? <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">{actions}</div> : null}
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
  label,
}: {
  page: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
  label?: string
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{label ?? `Page ${page} of ${Math.max(1, totalPages)}`}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
