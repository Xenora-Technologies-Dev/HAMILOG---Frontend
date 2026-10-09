import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { ApiError } from '@/services/apiClient'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notificationService'
import { formatDubaiDateTime } from '@/utils/date'

const TYPE_OPTIONS = [
  'ENQUIRY_ASSIGNED',
  'ENQUIRY_REASSIGNED',
  'ENQUIRY_FOLLOWUP_DUE',
  'ENQUIRY_OVERDUE',
  'REMINDER_DUE',
  'REMINDER_OVERDUE',
  'WHATSAPP_FAILED',
  'SYSTEM',
].map((value) => ({ value, label: value.replaceAll('_', ' ') }))

export function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const unreadOnly = searchParams.get('unread') === 'true'
  const type = searchParams.get('type') ?? ''
  const page = Number(searchParams.get('page') || '1') || 1

  const [rows, setRows] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const patch = (next: Record<string, string | null>, resetPage = true) => {
    const params = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (!v) params.delete(k)
      else params.set(k, v)
    }
    if (resetPage) params.set('page', '1')
    setSearchParams(params, { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listNotifications({
        page,
        pageSize: 20,
        unreadOnly: unreadOnly || undefined,
        type: type || undefined,
      })
      setRows(res.data)
      setUnreadCount(res.unreadCount)
      setTotalPages(res.pagination.totalPages)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load notifications')
    } finally {
      setLoading(false)
    }
  }, [page, unreadOnly, type])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const markOne = async (id: string) => {
    await markNotificationRead(id)
    await load()
  }

  const markAll = async () => {
    await markAllNotificationsRead()
    await load()
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="In-app operational alerts for your account."
        breadcrumb={<span>Home / Notifications</span>}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={() => void markAll()} disabled={loading || unreadCount === 0}>
              Mark all read
            </Button>
          </div>
        }
      />

      <Card title="Inbox" description={`${unreadCount} unread`}>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Select
            label="Type"
            value={type}
            onChange={(e) => patch({ type: e.target.value || null })}
            placeholder="All types"
            options={TYPE_OPTIONS}
          />
          <Select
            label="Status"
            value={unreadOnly ? 'unread' : 'all'}
            onChange={(e) =>
              patch({ unread: e.target.value === 'unread' ? 'true' : null })
            }
            options={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread only' },
            ]}
          />
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => setSearchParams({}, { replace: true })}>
              Clear filters
            </Button>
          </div>
        </div>

        {loading ? <LoadingState label="Loading notifications…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState title="No notifications" description="You’re all caught up." />
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <>
            <Table
              rows={rows}
              columns={[
                {
                  key: 'status',
                  header: '',
                  render: (r) =>
                    r.unread ? <Badge tone="warning">Unread</Badge> : <Badge>Read</Badge>,
                },
                {
                  key: 'when',
                  header: 'Date',
                  render: (r) => formatDubaiDateTime(r.createdAt),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (r) => r.type.replaceAll('_', ' '),
                },
                {
                  key: 'message',
                  header: 'Message',
                  render: (r) => (
                    <div>
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <p className="text-xs text-slate-500">{r.body}</p>
                    </div>
                  ),
                },
                {
                  key: 'link',
                  header: 'Record',
                  render: (r) =>
                    r.link ? (
                      <Link className="text-sm font-medium hover:underline" to={r.link}>
                        Open
                      </Link>
                    ) : (
                      '—'
                    ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (r) =>
                    r.unread ? (
                      <Button size="sm" variant="secondary" onClick={() => void markOne(r.id)}>
                        Mark read
                      </Button>
                    ) : null,
                },
              ]}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => patch({ page: String(page - 1) }, false)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => patch({ page: String(page + 1) }, false)}
              >
                Next
              </Button>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  )
}
