import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DateRangePresets } from '@/components/filters/DateRangePresets'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { ApiError } from '@/services/apiClient'
import {
  getAuditDetail,
  listAuditLogs,
  type AuditDetail,
  type AuditListItem,
} from '@/services/auditService'
import type { DateRangePreset } from '@/services/reportService'
import { formatDubaiDateTime } from '@/utils/date'

const ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'ASSIGN',
  'STATUS_CHANGE',
  'EXPORT',
  'SYSTEM',
].map((value) => ({ value, label: value }))

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const action = searchParams.get('action') ?? ''
  const event = searchParams.get('event') ?? ''
  const entityType = searchParams.get('entityType') ?? ''
  const entityId = searchParams.get('entityId') ?? ''
  const preset = (searchParams.get('preset') as DateRangePreset) || 'this_month'
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''
  const page = Number(searchParams.get('page') || '1') || 1

  const [rows, setRows] = useState<AuditListItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<AuditDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [retentionNote, setRetentionNote] = useState('')

  const patch = useCallback(
    (next: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams)
      for (const [k, v] of Object.entries(next)) {
        if (!v) params.delete(k)
        else params.set(k, v)
      }
      if (resetPage) params.set('page', '1')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAuditLogs({
        page,
        pageSize: 25,
        search: search || undefined,
        action: action || undefined,
        event: event || undefined,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        preset,
        fromDate: preset === 'custom' ? fromDate || undefined : undefined,
        toDate: preset === 'custom' ? toDate || undefined : undefined,
      })
      setRows(res.data)
      setTotalPages(res.pagination.totalPages)
      setTotal(res.pagination.total)
      setRetentionNote(res.retention.note)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load audit log')
    } finally {
      setLoading(false)
    }
  }, [page, search, action, event, entityType, entityId, preset, fromDate, toDate])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const openDetail = async (id: string) => {
    try {
      const res = await getAuditDetail(id)
      setDetail(res.data)
      setDetailOpen(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load audit detail')
    }
  }

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="System audit trail. Read-only. Business CRM timeline remains on enquiry records."
        breadcrumb={<span>Home / Audit</span>}
        actions={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <Card title="Filters" description={retentionNote || 'Retention: retain indefinitely by default.'}>
        <DateRangePresets
          preset={preset}
          fromDate={fromDate}
          toDate={toDate}
          onChange={(next) =>
            patch({
              preset: next.preset,
              from: next.preset === 'custom' ? next.fromDate || null : null,
              to: next.preset === 'custom' ? next.toDate || null : null,
            })
          }
        />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            label="Search"
            value={search}
            onChange={(e) => patch({ q: e.target.value || null })}
            placeholder="User, entity, IP…"
          />
          <Select
            label="Action"
            value={action}
            onChange={(e) => patch({ action: e.target.value || null })}
            placeholder="All actions"
            options={ACTION_OPTIONS}
          />
          <Input
            label="Event code"
            value={event}
            onChange={(e) => patch({ event: e.target.value || null })}
            placeholder="e.g. LOGIN_SUCCESS"
          />
          <Input
            label="Entity type"
            value={entityType}
            onChange={(e) => patch({ entityType: e.target.value || null })}
            placeholder="Enquiry, Reminder, User…"
          />
          <Input
            label="Entity ID"
            value={entityId}
            onChange={(e) => patch({ entityId: e.target.value || null })}
            placeholder="UUID"
          />
          <div className="flex items-end gap-2">
            <Button variant="ghost" onClick={() => setSearchParams({}, { replace: true })}>
              Clear all
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {loading ? <LoadingState label="Loading audit log…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState title="No audit events" description="Try widening the date range." />
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <>
            <Table
              rows={rows}
              columns={[
                {
                  key: 'when',
                  header: 'Date / time',
                  render: (r) => formatDubaiDateTime(r.createdAt),
                },
                { key: 'user', header: 'User', render: (r) => r.user?.name ?? 'System' },
                { key: 'event', header: 'Action / event', render: (r) => r.event || r.action },
                { key: 'entity', header: 'Entity', render: (r) => r.entityType },
                {
                  key: 'entityId',
                  header: 'Entity ID',
                  render: (r) => (
                    <span className="font-mono text-xs text-slate-600">
                      {r.entityId ? `${r.entityId.slice(0, 8)}…` : '—'}
                    </span>
                  ),
                },
                {
                  key: 'summary',
                  header: 'Summary',
                  render: (r) => (
                    <button
                      type="button"
                      className="text-left font-medium text-slate-900 hover:underline"
                      onClick={() => void openDetail(r.id)}
                    >
                      {r.summary}
                    </button>
                  ),
                },
              ]}
            />
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <span>
                Page {page} of {totalPages} · {total} records
              </span>
              <div className="flex gap-2">
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
            </div>
          </>
        ) : null}
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Audit detail">
        {detail ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">When:</span> {formatDubaiDateTime(detail.createdAt)}
            </p>
            <p>
              <span className="font-medium">Who:</span> {detail.user?.name ?? 'System'} (
              {detail.user?.email ?? 'n/a'})
            </p>
            <p>
              <span className="font-medium">Event:</span> {detail.event} ({detail.action})
            </p>
            <p>
              <span className="font-medium">Entity:</span> {detail.entityType}{' '}
              <span className="font-mono text-xs">{detail.entityId ?? '—'}</span>
            </p>
            <p>
              <span className="font-medium">IP:</span> {detail.ipAddress ?? '—'}
            </p>
            <div>
              <p className="mb-1 font-medium">Previous values</p>
              <pre className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                {JSON.stringify(detail.oldValues, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 font-medium">New values</p>
              <pre className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                {JSON.stringify(detail.newValues, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 font-medium">Metadata</p>
              <pre className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                {JSON.stringify(detail.metadata, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
