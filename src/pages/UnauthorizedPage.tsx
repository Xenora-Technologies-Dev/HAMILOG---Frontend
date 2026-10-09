import { ButtonLink } from '@/components/ui/Button'

export function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight">Access denied</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">You do not have permission to view this page.</p>
      <ButtonLink to="/" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </section>
  )
}
