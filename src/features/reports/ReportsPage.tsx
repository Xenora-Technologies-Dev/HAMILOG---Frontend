import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DateRangePresets } from '@/components/filters/DateRangePresets'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import { ApiError } from '@/services/apiClient'
import {
  downloadReportExport,
  getReportsBundle,
  triggerBlobDownload,
  type DateRangePreset,
  type ReportsBundle,
} from '@/services/reportService'
import { listStaff, type StaffMember } from '@/services/staffService'

function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: number | string | null }>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value ?? '—'}</p>
        </div>
      ))}
    </div>
  )
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0
  return (
    <div className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-2 text-sm">
      <span className="truncate text-slate-600">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-slate-800" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-medium text-slate-900">{count}</span>
    </div>
  )
}

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const preset = (searchParams.get('preset') as DateRangePreset) || 'this_month'
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''
  const staffId = searchParams.get('staff') ?? ''

  const [data, setData] = useState<ReportsBundle | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const filters = {
    preset,
    fromDate: preset === 'custom' ? fromDate || undefined : undefined,
    toDate: preset === 'custom' ? toDate || undefined : undefined,
    staffId: staffId || undefined,
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bundle, staffRes] = await Promise.all([
        getReportsBundle(filters),
        listStaff({ pageSize: 100, isActive: true }).catch(() => ({ data: [] as StaffMember[] })),
      ])
      setData(bundle.data)
      setStaff(staffRes.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load reports')
    } finally {
      setLoading(false)
    }
  }, [preset, fromDate, toDate, staffId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const patch = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (!v) params.delete(k)
      else params.set(k, v)
    }
    setSearchParams(params, { replace: true })
  }

  const exportReport = async (report: string, format: 'csv' | 'xlsx') => {
    setExporting(`${report}-${format}`)
    try {
      const blob = await downloadReportExport({ report, format, ...filters })
      triggerBlobDownload(blob, `${report}.${format === 'csv' ? 'csv' : 'xls'}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  const pipelineMax = Math.max(0, ...(data?.enquiryPipeline.pipeline.map((p) => p.count) ?? [0]))
  const sourceMax = Math.max(0, ...(data?.enquirySource.sources.map((s) => s.count) ?? [0]))
  const priorityMax = Math.max(0, ...(data?.priority.priorities.map((p) => p.count) ?? [0]))
  const categoryMax = Math.max(0, ...(data?.reminderCategory.categories.map((c) => c.count) ?? [0]))

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Operational intelligence for Asia/Dubai. Aggregated on the server."
        breadcrumb={<span>Home / Reports</span>}
        actions={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="mb-4">
        <Card title="Filters" description="Date boundaries use Asia/Dubai.">
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
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Select
              label="Staff"
              value={staffId}
              onChange={(e) => patch({ staff: e.target.value || null })}
              placeholder="All staff"
              options={staff.map((s) => ({ value: s.id, label: s.name }))}
            />
            <div className="flex items-end">
              <Button variant="ghost" onClick={() => setSearchParams({}, { replace: true })}>
                Clear filters
              </Button>
            </div>
          </div>
          {data ? (
            <p className="mt-2 text-xs text-slate-500">
              Range {data.enquiryOverview.range.fromDate} → {data.enquiryOverview.range.toDate} (
              {data.enquiryOverview.range.preset})
            </p>
          ) : null}
        </Card>
      </div>

      {loading ? <LoadingState label="Loading reports…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="No report data" description="Try a different date range." />
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-4">
          <Card
            title="Enquiry overview"
            description="Totals for the selected Dubai date range."
            actions={
              <Can permission="reports.export">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(exporting)}
                  onClick={() => void exportReport('enquiry_overview', 'csv')}
                >
                  Export CSV
                </Button>
              </Can>
            }
          >
            <MetricGrid
              items={[
                { label: 'Total', value: data.enquiryOverview.metrics.total },
                { label: 'New', value: data.enquiryOverview.metrics.new },
                { label: 'Open', value: data.enquiryOverview.metrics.open },
                { label: 'Completed', value: data.enquiryOverview.metrics.completed },
                { label: 'Lost', value: data.enquiryOverview.metrics.lost },
                { label: 'Cancelled', value: data.enquiryOverview.metrics.cancelled },
                { label: 'On hold', value: data.enquiryOverview.metrics.onHold },
                { label: 'Overdue', value: data.enquiryOverview.metrics.overdue },
              ]}
            />
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Enquiry pipeline" description="Counts by stage.">
              <div className="space-y-2">
                {data.enquiryPipeline.pipeline.map((stage) => (
                  <BarRow
                    key={stage.code}
                    label={stage.name}
                    count={stage.count}
                    max={pipelineMax}
                  />
                ))}
              </div>
            </Card>
            <Card title="Enquiry source">
              <div className="space-y-2">
                {data.enquirySource.sources.map((source) => (
                  <BarRow
                    key={source.source}
                    label={source.label}
                    count={source.count}
                    max={sourceMax}
                  />
                ))}
              </div>
            </Card>
            <Card title="Priority report">
              <div className="space-y-2">
                {data.priority.priorities.map((row) => (
                  <BarRow
                    key={row.priority}
                    label={row.priority}
                    count={row.count}
                    max={priorityMax}
                  />
                ))}
              </div>
            </Card>
            <Card title="Reminder overview">
              <MetricGrid
                items={[
                  { label: 'Active', value: data.reminderOverview.metrics.active },
                  { label: "Today's", value: data.reminderOverview.metrics.today },
                  { label: 'Upcoming', value: data.reminderOverview.metrics.upcoming },
                  { label: 'Overdue', value: data.reminderOverview.metrics.overdue },
                  { label: 'Completed', value: data.reminderOverview.metrics.completed },
                  { label: 'Cancelled', value: data.reminderOverview.metrics.cancelled },
                ]}
              />
            </Card>
          </div>

          <Card title="Reminder category report">
            <div className="space-y-2">
              {data.reminderCategory.categories.map((row) => (
                <BarRow key={row.code} label={row.name} count={row.count} max={categoryMax} />
              ))}
            </div>
          </Card>

          {data.whatsappDelivery ? (
            <Card title="WhatsApp delivery report">
              <MetricGrid
                items={[
                  { label: 'Queued', value: data.whatsappDelivery.metrics.queued },
                  { label: 'Sent', value: data.whatsappDelivery.metrics.sent },
                  { label: 'Delivered', value: data.whatsappDelivery.metrics.delivered },
                  { label: 'Read', value: data.whatsappDelivery.metrics.read },
                  { label: 'Failed', value: data.whatsappDelivery.metrics.failed },
                  {
                    label: 'Failure rate %',
                    value: data.whatsappDelivery.metrics.failureRatePercent,
                  },
                ]}
              />
            </Card>
          ) : null}

          <Card title="Staff performance" description="Assigned workload and outcomes.">
            <Table
              rows={data.staffPerformance.staff.map((s) => ({ ...s, id: s.staffId }))}
              columns={[
                { key: 'name', header: 'Staff', render: (r) => r.staffName },
                { key: 'assigned', header: 'Assigned', render: (r) => r.assigned },
                { key: 'open', header: 'Open', render: (r) => r.open },
                { key: 'completed', header: 'Completed', render: (r) => r.completed },
                { key: 'lost', header: 'Lost', render: (r) => r.lost },
                { key: 'overdue', header: 'Overdue', render: (r) => r.overdue },
                {
                  key: 'avg',
                  header: 'Avg completion (h)',
                  render: (r) =>
                    r.averageCompletionHours == null ? (
                      <span className="text-slate-400">n/a</span>
                    ) : (
                      r.averageCompletionHours
                    ),
                },
                { key: 'fuToday', header: "Today's follow-ups", render: (r) => r.followUpsToday },
                {
                  key: 'fuOver',
                  header: 'Overdue follow-ups',
                  render: (r) => r.followUpsOverdue,
                },
              ]}
            />
          </Card>

          <Card
            title="Overdue report"
            description="Drill-down to live records."
            actions={
              <Can permission="reports.export">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(exporting)}
                  onClick={() => void exportReport('overdue', 'xlsx')}
                >
                  Export Excel
                </Button>
              </Can>
            }
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Overdue enquiries</h3>
                <Table
                  rows={data.overdue.enquiries}
                  columns={[
                    {
                      key: 'enq',
                      header: 'Enquiry',
                      render: (r) => (
                        <Link className="font-medium hover:underline" to={`/enquiries/${r.id}`}>
                          {r.enquiryNumber}
                        </Link>
                      ),
                    },
                    { key: 'title', header: 'Title', render: (r) => r.title },
                    {
                      key: 'priority',
                      header: 'Priority',
                      render: (r) => <Badge tone="warning">{r.priority}</Badge>,
                    },
                    { key: 'owner', header: 'Staff', render: (r) => r.assignedTo?.name ?? '—' },
                  ]}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Overdue reminders</h3>
                <Table
                  rows={data.overdue.reminders}
                  columns={[
                    {
                      key: 'title',
                      header: 'Reminder',
                      render: (r) => (
                        <Link className="font-medium hover:underline" to={`/reminders/${r.id}`}>
                          {r.title}
                        </Link>
                      ),
                    },
                    { key: 'date', header: 'Event date', render: (r) => r.eventDate },
                    { key: 'owner', header: 'Owner', render: (r) => r.owner?.name ?? '—' },
                  ]}
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
