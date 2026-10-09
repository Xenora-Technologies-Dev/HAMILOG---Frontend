import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { priorityTone, statusTone } from '@/features/reminders/reminderFormUtils'
import { ApiError } from '@/services/apiClient'
import {
  downloadModuleExport,
  triggerBlobDownload,
} from '@/services/reportService'
import {
  completeReminder,
  listReminderCategories,
  listReminders,
  type Reminder,
  type ReminderCategory,
} from '@/services/reminderService'
import { listStaff, type StaffMember } from '@/services/staffService'
import { dubaiToday, formatDubaiDate, reminderWindowBucket } from '@/utils/date'


function duePhrase(eventDate: string, status: string): string {
  if (status === 'COMPLETED') return 'Acknowledged'
  if (status === 'CANCELLED') return 'Cancelled'
  const today = dubaiToday()
  if (eventDate === today) return 'Due today'
  const days = Math.round(
    (Date.parse(eventDate + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000,
  )
  if (days < 0) return `${-days}d overdue`
  return `In ${days}d`
}

export function ReminderListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  // The reminder list is intentionally limited to open/unacknowledged items.
  const status = 'ACTIVE'
  const categoryId = searchParams.get('category') ?? ''
  const priority = searchParams.get('priority') ?? ''
  const recipientUserId = searchParams.get('staff') ?? ''
  const windowFilter = searchParams.get('window') ?? ''
  const recurring = searchParams.get('recurring') ?? ''
  const sort =
    (searchParams.get('sort') as 'eventDate_asc' | 'eventDate_desc' | 'createdAt_desc') ||
    'eventDate_asc'
  const page = Number(searchParams.get('page') || '1') || 1

  const [rows, setRows] = useState<Reminder[]>([])
  const [categories, setCategories] = useState<ReminderCategory[]>([])
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
      const [reminders, cats, staffResult, todayQ, overdueQ, upcomingQ] = await Promise.all([
        listReminders({
          page,
          pageSize: 20,
          search: search.trim() || undefined,
          status,
          categoryId: categoryId || undefined,
          priority: priority || undefined,
          recipientUserId: recipientUserId || undefined,
          window: (windowFilter as 'overdue' | 'today' | 'upcoming') || undefined,
          completed: false,
          recurring: recurring === '' ? undefined : recurring === 'true',
          sort,
        }),
        listReminderCategories(),
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
      setCategories(cats.data)
      setStaff(staffResult.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load reminders')
    } finally {
      setLoading(false)
    }
  }, [
    page,
    search,
    categoryId,
    priority,
    recipientUserId,
    windowFilter,
    recurring,
    sort,
  ])

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

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  )

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="See what is due, who it is for, and acknowledge it in one tap. Amounts from the year planner are in the notes."
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
            { key: 'overdue', label: 'Overdue', hint: 'Still open, date has passed', count: queueCounts.overdue, tone: 'border-rose-200 bg-rose-50' },
            { key: 'today', label: 'Due today', hint: 'Needs a look today', count: queueCounts.today, tone: 'border-sky-200 bg-sky-50' },
            { key: 'upcoming', label: 'Upcoming', hint: 'Next 30 days', count: queueCounts.upcoming, tone: 'border-amber-200 bg-amber-50' },
          ] as const
        ).map((queue) => {
          const active = windowFilter === queue.key
          return (
            <button
              key={queue.key}
              type="button"
              onClick={() =>
                setFilter({
                  window: active ? null : queue.key,
                })
              }
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
                    categoryId: categoryId || undefined,
                    priority: priority || undefined,
                    recipientUserId: recipientUserId || undefined,
                    window: windowFilter || undefined,
                    completed: 'false',
                    recurring: recurring || undefined,
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
          placeholder="Title, person, reference"
        />
        <Select
          label="Category"
          value={categoryId}
          onChange={(e) => setFilter({ category: e.target.value || null })}
          options={categoryOptions}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setFilter({ priority: e.target.value || null })}
          options={[
            { value: '', label: 'All priorities' },
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
          ]}
        />
        <Select
          label="Window"
          value={windowFilter}
          onChange={(e) => setFilter({ window: e.target.value || null })}
          options={[
            { value: '', label: 'All dates' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'today', label: 'Today' },
            { value: 'upcoming', label: 'Upcoming (30d)' },
          ]}
        />
        <Select
          label="Assigned staff"
          value={recipientUserId}
          onChange={(e) => setFilter({ staff: e.target.value || null })}
          options={[
            { value: '', label: 'Anyone' },
            ...staff.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Select
          label="Recurring"
          value={recurring}
          onChange={(e) => setFilter({ recurring: e.target.value || null })}
          options={[
            { value: '', label: 'Any' },
            { value: 'true', label: 'Recurring only' },
            { value: 'false', label: 'One-time only' },
          ]}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={(e) => setFilter({ sort: e.target.value || null }, false)}
          options={[
            { value: 'eventDate_asc', label: 'Event date ↑' },
            { value: 'eventDate_desc', label: 'Event date ↓' },
            { value: 'createdAt_desc', label: 'Newest created' },
          ]}
        />
      </FilterBar>

      {loading ? <LoadingState label="Loading reminders…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No reminders found"
          description="Create a reminder or adjust filters to see results."
        />
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
                      <span className="mt-0.5 block text-xs font-normal text-slate-500">
                        {row.category.name}
                        {row.notes ? ` · ${row.notes.split('\n')[0]}` : ''}
                      </span>
                    </Link>
                  ),
                },
                {
                  key: 'person',
                  header: 'Person / Ref',
                  render: (row) => (
                    <span>
                      {row.personName || '—'}
                      {row.referenceCode ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{row.referenceCode}</span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (row) => {
                    const bucket = row.status === 'COMPLETED' ? 'acknowledged' : reminderWindowBucket(row.eventDate)
                    const tone = bucket === 'overdue' ? 'danger' : bucket === 'today' ? 'info' : bucket === 'acknowledged' ? 'success' : 'warning'
                    return (
                      <span>
                        {formatDubaiDate(row.eventDate)}
                        <span className="mt-1 block">
                          <Badge tone={tone}>{duePhrase(row.eventDate, row.status)}</Badge>
                        </span>
                      </span>
                    )
                  },
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (row) => <Badge tone={priorityTone(row.priority)}>{row.priority}</Badge>,
                },
                {
                  key: 'assigned',
                  header: 'Assigned',
                  render: (row) => (
                    <span>
                      {row.ownerUser?.name ?? 'Unassigned'}
                      {row.personName ? (
                        <span className="mt-0.5 block text-xs text-slate-500">For {row.personName}</span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <Badge tone={statusTone(row.status)}>{row.status === 'COMPLETED' ? 'ACKNOWLEDGED' : row.status}</Badge>,
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
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link className="font-medium text-slate-900 hover:underline" to={`/reminders/${row.id}`}>
                      {row.title}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {row.personName || 'No person'} · {formatDubaiDate(row.eventDate)}
                    </p>
                  </div>
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={priorityTone(row.priority)}>{row.priority}</Badge>
                  <Badge>{duePhrase(row.eventDate, row.status)}</Badge>
                  <span className="text-xs text-slate-500">{row.ownerUser?.name ?? 'Unassigned'}</span>
                  {row.status === 'ACTIVE' ? (
                    <Can permission="reminders.complete">
                      <Button size="sm" busy={ackingId === row.id} onClick={() => void acknowledge(row.id)}>
                        Acknowledge
                      </Button>
                    </Can>
                  ) : null}
                </div>
              </div>
            ))}
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
