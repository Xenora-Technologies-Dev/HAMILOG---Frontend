import { useEffect, useId, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  lookupCustomers,
  type CustomerLookupItem,
} from '@/services/customerService'
import { priorityLabel, priorityTone } from '@/features/enquiries/enquiryFormUtils'

export function PriorityBadge({ priority, overdue }: { priority: string; overdue?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={priorityTone(priority)}>
        <span aria-hidden="true" className="mr-1">
          {priority === 'URGENT' ? '!!' : priority === 'HIGH' ? '!' : '·'}
        </span>
        {priorityLabel(priority)}
      </Badge>
      {overdue ? (
        <Badge tone="danger">
          <span aria-hidden="true" className="mr-1">
            ⚠
          </span>
          Overdue
        </Badge>
      ) : null}
    </span>
  )
}

type CustomerAsyncSearchProps = {
  selected: CustomerLookupItem | null
  onSelect: (customer: CustomerLookupItem | null) => void
  disabled?: boolean
  error?: string | null
}

export function CustomerAsyncSearch({
  selected,
  onSelect,
  disabled,
  error,
}: CustomerAsyncSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerLookupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  useEffect(() => {
    if (selected) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      const clearTimer = window.setTimeout(() => {
        setResults([])
        setLookupError(null)
      }, 0)
      return () => window.clearTimeout(clearTimer)
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        setLookupError(null)
        try {
          const res = await lookupCustomers({ search: trimmed, limit: 12 })
          setResults(res.data)
        } catch {
          setLookupError('Unable to search customers')
          setResults([])
        } finally {
          setLoading(false)
        }
      })()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, selected])

  if (selected) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-slate-900">{selected.companyName}</p>
            <p className="mt-1 text-sm text-slate-600">
              {[selected.contactName, selected.mobile, selected.email].filter(Boolean).join(' · ') ||
                'No primary contact details'}
            </p>
          </div>
          {!disabled ? (
            <button
              type="button"
              className="text-sm font-medium text-slate-700 underline"
              onClick={() => {
                onSelect(null)
                setQuery('')
                setResults([])
              }}
            >
              Change
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Input
        label="Search customer"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Type company, contact, mobile, or email"
        list={listId}
      />
      {loading ? <p className="mt-2 text-xs text-slate-500">Searching…</p> : null}
      {lookupError || error ? (
        <p className="mt-2 text-xs text-rose-700">{lookupError || error}</p>
      ) : null}
      {results.length > 0 ? (
        <ul
          id={listId}
          className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white"
        >
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => onSelect(item)}
              >
                <span className="block font-medium text-slate-900">{item.companyName}</span>
                <span className="block text-xs text-slate-500">
                  {[item.contactName, item.mobile, item.city].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!loading && query.trim().length >= 2 && results.length === 0 && !lookupError ? (
        <p className="mt-2 text-xs text-slate-500">No customers found. Create one if authorized.</p>
      ) : null}
    </div>
  )
}
