import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import {
  getEnquiryTimeline,
  type TimelineItem,
} from '@/services/enquiryService'
import { formatDubaiDateTime } from '@/utils/date'

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER_CALL: 'Customer call',
  CUSTOMER_WHATSAPP: 'Customer WhatsApp',
  CUSTOMER_EMAIL: 'Customer email',
  CUSTOMER_MEETING: 'Customer meeting',
  SUPPLIER_CONTACT: 'Supplier contact',
  QUOTATION_SENT: 'Quotation sent',
  INTERNAL_NOTE: 'Internal note',
  FOLLOW_UP: 'Follow-up',
  STAGE_CHANGE: 'Stage change',
  ASSIGNMENT_CHANGE: 'Assignment',
  PRIORITY_CHANGE: 'Priority change',
  OTHER: 'Other',
}

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type.replaceAll('_', ' ')
}

export function EnquiryTimeline({ enquiryId }: { enquiryId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const result = await getEnquiryTimeline(enquiryId, { page: nextPage, pageSize: 20 })
        setItems((prev) => (append ? [...prev, ...result.data] : result.data))
        setPage(result.meta.page)
        setTotalPages(result.meta.totalPages)
        setTotal(result.meta.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load timeline')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [enquiryId],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage(1, false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadPage])

  if (loading) return <LoadingState label="Loading timeline…" />
  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={() => void loadPage(1, false)} />
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Follow-ups, comments, stage changes, and attachments will appear here."
      />
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">{total} event(s)</p>
      <ol className="relative space-y-0 border-l border-slate-200 pl-4">
        {items.map((item) => (
          <li key={item.id} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-600" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{typeLabel(item.type)}</p>
              <time className="text-xs text-slate-500">{formatDubaiDateTime(item.occurredAt)}</time>
            </div>
            {item.subject ? <p className="mt-1 text-sm text-slate-800">{item.subject}</p> : null}
            {item.body ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">by {item.performedBy.name}</p>
          </li>
        ))}
      </ol>
      {page < totalPages ? (
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadPage(page + 1, true)}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
