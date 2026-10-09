import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import { priorityTone } from '@/features/reminders/reminderFormUtils'
import { useAuth } from '@/features/auth/useAuth'
import { ApiError } from '@/services/apiClient'
import { getDashboardOverview, type DashboardOverview } from '@/services/dashboardService'
import { formatDubaiDate, formatDubaiDateTime } from '@/utils/date'

const kpiTones = {
  sky: 'from-sky-50 via-white to-white border-sky-100',
  rose: 'from-rose-50 via-white to-white border-rose-100',
  amber: 'from-amber-50 via-white to-white border-amber-100',
  indigo: 'from-indigo-50 via-white to-white border-indigo-100',
  emerald: 'from-emerald-50 via-white to-white border-emerald-100',
  violet: 'from-violet-50 via-white to-white border-violet-100',
  slate: 'from-slate-50 via-white to-white border-slate-200',
} as const

function KpiCard({
  label,
  value,
  loading,
  unavailable,
  to,
  hint,
  tone = 'slate',
}: {
  label: string
  value?: number
  loading?: boolean
  unavailable?: boolean
  to?: string
  hint?: string
  tone?: keyof typeof kpiTones
}) {
  const body = (
    <div
      className={`h-full rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:shadow-md ${kpiTones[tone]}`}
    >
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
      ) : unavailable ? (
        <p className="mt-3 text-3xl font-semibold text-slate-300">—</p>
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value ?? 0}</p>
      )}
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
  if (!to || unavailable) return body
  return (
    <Link to={to} className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      {body}
    </Link>
  )
}

function SectionShell({
  title,
  description,
  loading,
  error,
  onRetry,
  children,
  empty,
  actions,
}: {
  title: string
  description?: string
  loading: boolean
  error: string | null
  onRetry: () => void
  children: ReactNode
  empty?: boolean
  actions?: ReactNode
}) {
  return (
    <Card title={title} description={description} actions={actions} padded={false}>
      <div className="px-5 py-4">
        {loading ? <LoadingState label={`Loading ${title.toLowerCase()}…`} /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {!loading && !error && empty ? (
          <EmptyState title="Nothing here" description="No records for this section yet." />
        ) : null}
        {!loading && !error && !empty ? children : null}
      </div>
    </Card>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSectionErrors({})
    try {
      const res = await getDashboardOverview()
      setData(res.data)
    } catch (err) {
      setData(null)
      setError(err instanceof ApiError ? err.message : 'Unable to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const kpis = data?.kpis
  const canReminders = data?.permissions.canViewReminders ?? false
  const canEnquiries = data?.permissions.canViewEnquiries ?? false
  const canUsers = data?.permissions.canViewUsers ?? false

  return (
    <div>
      <PageHeader
        title="Overview"
        description={`Welcome back, ${user?.name ?? 'team'}. Operational attention for Asia/Dubai.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
              {data?.dubaiNow ?? 'Asia/Dubai'}
            </span>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Can permission="enquiries.create">
          <ButtonLink to="/enquiries/new" variant="secondary">
            New enquiry
          </ButtonLink>
        </Can>
        <Can permission="reminders.create">
          <ButtonLink to="/reminders/new">New reminder</ButtonLink>
        </Can>
        <Can permission="users.create">
          <ButtonLink to="/staff" variant="secondary">
            Add staff
          </ButtonLink>
        </Can>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's reminders"
          value={kpis?.remindersToday}
          loading={loading}
          unavailable={!canReminders && !loading}
          to="/reminders?window=today"
          hint="Due today"
          tone="sky"
        />
        <KpiCard
          label="Overdue reminders"
          value={kpis?.remindersOverdue}
          loading={loading}
          unavailable={!canReminders && !loading}
          to="/reminders?window=overdue"
          hint="Needs attention"
          tone="rose"
        />
        <KpiCard
          label="Upcoming reminders"
          value={kpis?.remindersUpcoming}
          loading={loading}
          unavailable={!canReminders && !loading}
          to="/reminders?window=upcoming"
          hint="Next 30 days"
          tone="amber"
        />
        <KpiCard
          label="Open enquiries"
          value={kpis?.openEnquiries}
          loading={loading}
          unavailable={!canEnquiries && !loading}
          to="/enquiries"
          hint="Active pipeline"
          tone="indigo"
        />
        <KpiCard
          label="New enquiries"
          value={kpis?.newEnquiries}
          loading={loading}
          unavailable={!canEnquiries && !loading}
          to="/enquiries?status=NEW"
          hint="Recently opened"
          tone="violet"
        />
        <KpiCard
          label="Overdue enquiries"
          value={kpis?.overdueEnquiries}
          loading={loading}
          unavailable={!canEnquiries && !loading}
          to="/enquiries?overdue=true"
          hint="Past due date"
          tone="rose"
        />
        <KpiCard
          label="Completed enquiries"
          value={kpis?.completedEnquiries}
          loading={loading}
          unavailable={!canEnquiries && !loading}
          to="/enquiries?status=COMPLETED"
          hint="Closed won"
          tone="emerald"
        />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <SectionShell
          title="Today's reminders"
          description="Overdue, today, and near-term events."
          loading={loading}
          error={sectionErrors.reminders ?? (!canReminders && !loading ? 'No reminder view permission' : null)}
          onRetry={() => void load()}
          empty={!loading && (data?.todaysReminders.length ?? 0) === 0}
        >
          <Table
            rows={(data?.todaysReminders ?? []).map((r) => ({ ...r, id: r.id }))}
            columns={[
              {
                key: 'event',
                header: 'Event',
                render: (r) => (
                  <Link className="font-medium text-slate-900 hover:underline" to={`/reminders/${r.id}`}>
                    {r.title}
                  </Link>
                ),
              },
              {
                key: 'person',
                header: 'Person / Ref',
                render: (r) => (
                  <span>
                    {r.personName || '—'}
                    {r.referenceCode ? (
                      <span className="mt-0.5 block text-xs text-slate-500">{r.referenceCode}</span>
                    ) : null}
                  </span>
                ),
              },
              {
                key: 'date',
                header: 'Date',
                render: (r) => (
                  <span>
                    {formatDubaiDate(r.eventDate)}
                    <span className="mt-0.5 block text-xs text-slate-500">{r.bucket}</span>
                  </span>
                ),
              },
              {
                key: 'priority',
                header: 'Priority',
                render: (r) => <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>,
              },
              { key: 'assigned', header: 'Assigned', render: (r) => r.assignedTo || '—' },
              { key: 'status', header: 'Status', render: (r) => r.status },
              {
                key: 'whatsapp',
                header: 'WhatsApp',
                render: (r) =>
                  r.whatsappLabel ? (
                    <span
                      className={
                        r.whatsappStatus === 'FAILED'
                          ? 'text-rose-700'
                          : r.whatsappStatus === 'DELIVERED' || r.whatsappStatus === 'READ'
                            ? 'text-emerald-700'
                            : 'text-slate-600'
                      }
                    >
                      {r.whatsappLabel}
                    </span>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        </SectionShell>

        <SectionShell
          title="Enquiry pipeline"
          description="Live stage counts from enquiry CRM."
          loading={loading}
          error={sectionErrors.pipeline ?? (!canEnquiries && !loading ? 'No enquiry view permission' : null)}
          onRetry={() => void load()}
          empty={!loading && (data?.enquiryPipeline.length ?? 0) === 0}
          actions={
            <ButtonLink to="/enquiries/board" variant="ghost" size="sm">
              Open board
            </ButtonLink>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {(data?.enquiryPipeline ?? []).map((stage) => (
              <Link
                key={stage.code}
                to={`/enquiries?stage=${encodeURIComponent(stage.code)}`}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{stage.name}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{stage.count}</p>
              </Link>
            ))}
          </div>
        </SectionShell>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <SectionShell
          title="Staff workload"
          description="Open enquiries and reminder load by staff."
          loading={loading}
          error={sectionErrors.staff ?? (!canUsers && !loading ? 'No staff view permission' : null)}
          onRetry={() => void load()}
          empty={!loading && (data?.staffWorkload.length ?? 0) === 0}
        >
          <Table
            rows={(data?.staffWorkload ?? []).map((s) => ({ ...s, id: s.staffId }))}
            columns={[
              {
                key: 'staff',
                header: 'Staff',
                render: (s) => (
                  <Link className="font-medium hover:underline" to={`/enquiries?staff=${s.staffId}`}>
                    {s.staffName}
                  </Link>
                ),
              },
              {
                key: 'open',
                header: 'Open enquiries',
                render: (s) => (
                  <Link className="hover:underline" to={`/enquiries?staff=${s.staffId}`}>
                    {s.openEnquiries}
                  </Link>
                ),
              },
              {
                key: 'enqOverdue',
                header: 'Overdue enquiries',
                render: (s) => (
                  <Link className="hover:underline" to={`/enquiries?staff=${s.staffId}&overdue=true`}>
                    {s.overdueEnquiries ?? 0}
                  </Link>
                ),
              },
              {
                key: 'today',
                header: "Today's reminders",
                render: (s) => (
                  <Link className="hover:underline" to={`/reminders?staff=${s.staffId}&window=today`}>
                    {s.todaysReminders}
                  </Link>
                ),
              },
              {
                key: 'overdue',
                header: 'Overdue reminders',
                render: (s) => (
                  <Link className="hover:underline" to={`/reminders?staff=${s.staffId}&window=overdue`}>
                    {s.overdueReminders}
                  </Link>
                ),
              },
            ]}
          />
        </SectionShell>

        <SectionShell
          title="Recent activity"
          description="Latest enquiry CRM activity."
          loading={loading}
          error={sectionErrors.activity ?? null}
          onRetry={() => void load()}
          empty={!loading && (data?.recentActivity.length ?? 0) === 0}
        >
          <ul className="space-y-3">
            {(data?.recentActivity ?? []).map((item) => (
              <li key={item.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {item.enquiryNumber ? `${item.enquiryNumber} · ` : ''}
                    {item.action.replaceAll('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500">{formatDubaiDateTime(item.createdAt)}</span>
                </div>
                {item.summary ? <p className="mt-1 text-slate-700">{item.summary}</p> : null}
                <p className="mt-1 text-slate-500">{item.actorName}</p>
              </li>
            ))}
          </ul>
        </SectionShell>
      </div>
    </div>
  )
}
