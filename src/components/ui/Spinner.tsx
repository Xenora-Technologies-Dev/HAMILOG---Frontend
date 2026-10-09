export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-slate-800 ${className}`}
      aria-hidden="true"
    />
  )
}
