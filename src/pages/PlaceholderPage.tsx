import { PageHeader } from '@/components/ui/PageHeader'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} breadcrumb={<span>Home / {title}</span>} />
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-sm text-slate-500">
        Business module not implemented yet. Navigation is permission-gated only.
      </div>
    </div>
  )
}
