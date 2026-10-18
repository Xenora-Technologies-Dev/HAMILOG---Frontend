import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { FilterBar, Pagination } from '@/components/ui/FilterBar'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import { recurrenceLabel } from '@/features/reminders/reminderFormUtils'
import { ApiError } from '@/services/apiClient'
import { downloadModuleExport, triggerBlobDownload } from '@/services/reportService'
import { completeReminder, listReminders, type Reminder } from '@/services/reminderService'
import { listStaff, type StaffMember } from '@/services/staffService'
import { dubaiToday, formatDubaiDate, formatDubaiTime, reminderWindowBucket } from '@/utils/date'

function duePhrase(eventDate: string, status: string): string {
  if (status === 'COMPLETED') return 'Acknowledged'
  if (status === 'CANCELLED') return 'Cancelled'
  const today = dubaiToday()
  if (eventDate === today) return 'Due today'
  const days = Math.round(
    (Date.parse(`${eventDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000,
  )
  if (days < 0) return `${-days}d overdue`
  return `In ${days}d`
}

export function ReminderListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const status = 'ACTIVE'
  const recipientUserId = searchParams.get('staff') ?? ''
  const windowFilter = searchParams.get('window') ?? ''
  const page = Number(searchParams.get('page') || '1') || 1

  const [rows, setRows] = useState<Reminder[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [queueCounts, setQueueCounts] = useState({ today: 0, overdue: 0, upcoming: 0 })
  const [ackingId, setAckingId] = useState<string | null>(null)
  const [ackError, setAckError] = useState<string | null>(null)

  const setFilter = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key)
        else next.set(key, value)
      }
      if (resetPage) next.set('page', '1')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queueQuery = { page: 1, pageSize: 1, status: 'ACTIVE' as const }
      const [reminders, staffResult, todayQ, overdueQ, upcomingQ] = await Promise.all([
        listReminders({
          page,
          pageSize: 20,
          search: search.trim() || undefined,
          status,
          recipientUserId: recipientUserId || undefined,
          window: (windowFilter as 'overdue' | 'today' | 'upcoming') || undefined,
          completed: false,
          sort: 'eventDate_asc',
        }),
        listStaff({ pageSize: 100, isActive: true }).catch(() => ({ data: [] as StaffMember[] })),
        listReminders({ ...queueQuery, window: 'today' }),
        listReminders({ ...queueQuery, window: 'overdue' }),
        listReminders({ ...queueQuery, window: 'upcoming' }),
      ])
      setRows(reminders.data)
      setTotalPages(reminders.pagination.totalPages)
      setTotal(reminders.pagination.total)
      setQueueCounts({
        today: todayQ.pagination.total,
        overdue: overdueQ.pagination.total,
        upcoming: upcomingQ.pagination.total,
      })
      setStaff(staffResult.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load reminders')
    } finally {
      setLoading(false)
    }
  }, [page, search, recipientUserId, windowFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [load])

  async function acknowledge(id: string) {
    setAckingId(id)
    setAckError(null)
    try {
      await completeReminder(id)
      await load()
    } catch (err) {
      setAckError(err instanceof ApiError ? err.message : 'Unable to acknowledge reminder')
    } finally {
      setAckingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="Open events, who they are for, and when they are due."
        breadcrumb={<span>Home / Reminders</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Can permission="reminders.view">
              <ButtonLink to="/reminders/calendar" variant="secondary">
                Calendar
              </ButtonLink>
            </Can>
            <Can permission="reminders.create">
              <ButtonLink to="/reminders/new">New reminder</ButtonLink>
            </Can>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {(
          [
            { key: 'overdue', label: 'Overdue', hint: 'Date has passed', count: queueCounts.overdue, tone: 'border-rose-200 bg-rose-50' },
            { key: 'today', label: 'Due today', hint: 'Happening today', count: queueCounts.today, tone: 'border-sky-200 bg-sky-50' },
            { key: 'upcoming', label: 'Upcoming', hint: 'Next 30 days', count: queueCounts.upcoming, tone: 'border-amber-200 bg-amber-50' },
          ] as const
        ).map((queue) => {
          const active = windowFilter === queue.key
          return (
            <button
              key={queue.key}
              type="button"
              onClick={() => setFilter({ window: active ? null : queue.key })}
              className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${queue.tone} ${active ? 'ring-2 ring-slate-900' : 'hover:shadow-md'}`}
            >
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{queue.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{queue.count}</p>
              <p className="mt-1 text-xs text-slate-600">{queue.hint}</p>
            </button>
          )
        })}
      </div>
      {ackError ? <p className="mb-3 text-sm text-rose-700">{ackError}</p> : null}

      <FilterBar
        actions={
          <>
            <Button variant="ghost" onClick={() => setSearchParams({}, { replace: true })}>
              Clear filters
            </Button>
            <Can permission="reports.export">
              <Button
                variant="secondary"
                onClick={() => {
                  void downloadModuleExport({
                    module: 'reminders',
                    format: 'csv',
                    search: search || undefined,
                    status,
                    recipientUserId: recipientUserId || undefined,
                    window: windowFilter || undefined,
                    completed: 'false',
                  }).then((blob) => triggerBlobDownload(blob, 'reminders.csv'))
                }}
              >
                Export CSV
              </Button>
            </Can>
          </>
        }
      >
        <Input
          label="Search"
          value={search}
          onChange={(e) => setFilter({ q: e.target.value || null })}
          placeholder="Event name"
        />
        <Select
          label="Due"
          value={windowFilter}
          onChange={(e) => setFilter({ window: e.target.value || null })}
          options={[
            { value: '', label: 'All dates' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'today', label: 'Today' },
            { value: 'upcoming', label: 'Upcoming (30 days)' },
          ]}
        />
        <Select
          label="Staff"
          value={recipientUserId}
          onChange={(e) => setFilter({ staff: e.target.value || null })}
          options={[
            { value: '', label: 'Anyone' },
            ...staff.map((member) => ({ value: member.id, label: member.name })),
          ]}
        />
      </FilterBar>

      {loading ? <LoadingState label="Loading reminders…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No reminders" description="Create a reminder, or clear the filters." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table
              rows={rows}
              columns={[
                {
                  key: 'event',
                  header: 'Event',
                  render: (row) => (
                    <Link className="font-medium text-slate-900 hover:underline" to={`/reminders/${row.id}`}>
                      {row.title}
                    </Link>
                  ),
                },
                {
                  key: 'when',
                  header: 'Date and time',
                  render: (row) => (
                    <span>
                      {formatDubaiDate(row.eventDate)}
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {formatDubaiTime(row.eventTime) || '—'}
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'repeats',
                  header: 'Repeats',
                  render: (row) => recurrenceLabel(row.recurrenceType, row.recurrenceInterval),
                },
                {
                  key: 'staff',
                  header: 'Staff',
                  render: (row) => row.ownerUser?.name ?? 'Unassigned',
                },
                {
                  key: 'due',
                  header: 'Due',
                  render: (row) => {
                    const bucket = reminderWindowBucket(row.eventDate)
                    const tone = bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'info' : 'warning'
                    return <Badge tone={tone}>{duePhrase(row.eventDate, row.status)}</Badge>
                  },
                },
                {
                  key: 'ack',
                  header: '',
                  render: (row) =>
                    row.status === 'ACTIVE' ? (
                      <Can permission="reminders.complete">
                        <Button size="sm" busy={ackingId === row.id} onClick={() => void acknowledge(row.id)}>
                          Acknowledge
                        </Button>
                      </Can>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    ),
                },
              ]}
            />
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => {
              const bucket = reminderWindowBucket(row.eventDate)
              const tone = bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'info' : 'warning'
              return (
                <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Link className="font-medium text-slate-900 hover:underline" to={`/reminders/${row.id}`}>
                    {row.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDubaiDate(row.eventDate)}
                    {formatDubaiTime(row.eventTime) ? ` · ${formatDubaiTime(row.eventTime)}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {recurrenceLabel(row.recurrenceType, row.recurrenceInterval)} · {row.ownerUser?.name ?? 'Unassigned'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={tone}>{duePhrase(row.eventDate, row.status)}</Badge>
                    {row.status === 'ACTIVE' ? (
                      <Can permission="reminders.complete">
                        <Button size="sm" busy={ackingId === row.id} onClick={() => void acknowledge(row.id)}>
                          Acknowledge
                        </Button>
                      </Can>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrevious={() => setFilter({ page: String(Math.max(1, page - 1)) }, false)}
            onNext={() => setFilter({ page: String(page + 1) }, false)}
            label={`${total} reminder${total === 1 ? '' : 's'} · Page ${page} of ${totalPages}`}
          />
        </>
      ) : null}
    </div>
  )
}
