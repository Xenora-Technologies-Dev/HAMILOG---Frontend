import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-12 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-12 text-sm text-slate-600 shadow-sm">
      <Spinner className="h-4 w-4" />
      {label}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-900">
      <p className="font-medium">{title}</p>
      <p className="mt-1 leading-6">{message}</p>
      {onRetry ? (
        <Button type="button" variant="danger" size="sm" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
