import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { FilterBar, Pagination } from '@/components/ui/FilterBar'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import { PriorityBadge } from '@/features/enquiries/EnquiryShared'
import {
  PRIORITY_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  statusTone,
} from '@/features/enquiries/enquiryFormUtils'
import { ApiError } from '@/services/apiClient'
import {
  addEnquiryComment,
  changeEnquiryStage,
  completeEnquiry,
  listEnquiries,
  listEnquiryStages,
  type EnquiryListItem,
  type EnquiryPriority,
  type EnquirySource,
  type EnquiryStage,
  type EnquiryStatus,
} from '@/services/enquiryService'
import { downloadModuleExport, triggerBlobDownload } from '@/services/reportService'
import { listStaff, type StaffMember } from '@/services/staffService'
import { formatDubaiDate, formatDubaiDateTime } from '@/utils/date'

function readParam(params: URLSearchParams, key: string) {
  return params.get(key) ?? ''
}

export function EnquiryListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<EnquiryListItem[]>([])
  const [stages, setStages] = useState<EnquiryStage[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [action, setAction] = useState<null | { type: 'respond' | 'close'; row: EnquiryListItem }>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const search = readParam(searchParams, 'q')
  const status = readParam(searchParams, 'status') as EnquiryStatus | ''
  const stageCode = readParam(searchParams, 'stage')
  const priority = readParam(searchParams, 'priority') as EnquiryPriority | ''
  const assignedToId = readParam(searchParams, 'staff')
  const customerId = readParam(searchParams, 'customer')
  const source = readParam(searchParams, 'source') as EnquirySource | ''
  const overdue = readParam(searchParams, 'overdue')
  const productName = readParam(searchParams, 'product')
  const fromDate = readParam(searchParams, 'from')
  const toDate = readParam(searchParams, 'to')
  const dueFrom = readParam(searchParams, 'dueFrom')
  const dueTo = readParam(searchParams, 'dueTo')
  const nextFollowUpFrom = readParam(searchParams, 'followFrom')
  const nextFollowUpTo = readParam(searchParams, 'followTo')
  const sort = readParam(searchParams, 'sort') || 'updatedAt_desc'
  const page = Number(readParam(searchParams, 'page') || '1') || 1

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

  const clearFilters = () => setSearchParams({}, { replace: true })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [enquiries, stageResult, staffResult] = await Promise.all([
        listEnquiries({
          page,
          pageSize: 20,
          search: search.trim() || undefined,
          status: status || undefined,
          stageCode: stageCode || undefined,
          priority: priority || undefined,
          assignedToId: assignedToId || undefined,
          customerId: customerId || undefined,
          source: source || undefined,
          overdue: overdue === '' ? undefined : overdue === 'true',
          productName: productName || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          dueFrom: dueFrom || undefined,
          dueTo: dueTo || undefined,
          nextFollowUpFrom: nextFollowUpFrom || undefined,
          nextFollowUpTo: nextFollowUpTo || undefined,
          sort,
        }),
        listEnquiryStages(),
        listStaff({ pageSize: 100, isActive: true }).catch(() => ({ data: [] as StaffMember[] })),
      ])
      setRows(enquiries.data)
      setTotalPages(enquiries.pagination.totalPages)
      setTotal(enquiries.pagination.total)
      setStages(stageResult.data)
      setStaff(staffResult.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load enquiries')
    } finally {
      setLoading(false)
    }
  }, [
    page,
    search,
    status,
    stageCode,
    priority,
    assignedToId,
    customerId,
    source,
    overdue,
    productName,
    fromDate,
    toDate,
    dueFrom,
    dueTo,
    nextFollowUpFrom,
    nextFollowUpTo,
    sort,
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [load])


  const closedStatuses = new Set(['COMPLETED', 'LOST', 'CANCELLED', 'WON'])

  function openAction(type: 'respond' | 'close', row: EnquiryListItem) {
    setAction({ type, row })
    setActionNote('')
    setActionError(null)
  }

  async function submitAction() {
    if (!action) return
    const note = actionNote.trim()
    if (!note) {
      setActionError(action.type === 'close' ? 'Add a short close note' : 'Write the response or note')
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      if (action.type === 'respond') {
        await addEnquiryComment(action.row.id, { body: note })
        if (action.row.status === 'NEW' || action.row.stage?.code === 'NEW') {
          await changeEnquiryStage(action.row.id, {
            stageCode: 'CONTACTED',
            reason: note,
          })
        }
      } else {
        await completeEnquiry(action.row.id, { note })
      }
      setAction(null)
      await load()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Unable to update enquiry')
    } finally {
      setActionBusy(false)
    }
  }

  const staffOptions = useMemo(
    () => [
      { value: '', label: 'All staff' },
      ...staff.map((member) => ({ value: member.id, label: member.name })),
    ],
    [staff],
  )

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="Work the pipeline in the app: see status and owner, log a response, or close it. WhatsApp intake comes later."
        breadcrumb={<span>Home / Enquiries</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Can permission="enquiries.view">
              <ButtonLink to="/enquiries/board" variant="secondary">
                Board
              </ButtonLink>
            </Can>
            <Can permission="enquiries.create">
              <ButtonLink to="/enquiries/new">New enquiry</ButtonLink>
            </Can>
          </div>
        }
      />


      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { label: 'All', patch: { status: null, overdue: null, stage: null } },
            { label: 'New', patch: { status: 'NEW', overdue: null, stage: null } },
            { label: 'In progress', patch: { status: 'IN_PROGRESS', overdue: null, stage: null } },
            { label: 'Waiting on customer', patch: { status: 'WAITING_CUSTOMER', overdue: null, stage: null } },
            { label: 'Quoted', patch: { status: 'QUOTED', overdue: null, stage: null } },
            { label: 'Overdue follow-up', patch: { status: null, overdue: 'true', stage: null } },
          ] as const
        ).map((chip) => {
          const active =
            (chip.patch.status ?? '') === status &&
            (chip.patch.overdue ?? '') === overdue &&
            (chip.patch.stage ?? '') === stageCode
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => setFilter(chip.patch)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <FilterBar
        actions={
          <>
            <Can permission="reports.export">
              <Button
                variant="secondary"
                onClick={() => {
                  void downloadModuleExport({
                    module: 'enquiries',
                    format: 'csv',
                    search: search || undefined,
                    status: status || undefined,
                    stageCode: stageCode || undefined,
                    priority: priority || undefined,
                    assignedToId: assignedToId || undefined,
                    customerId: customerId || undefined,
                    source: source || undefined,
                    overdue: overdue || undefined,
                    productName: productName || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    dueFrom: dueFrom || undefined,
                    dueTo: dueTo || undefined,
                    nextFollowUpFrom: nextFollowUpFrom || undefined,
                    nextFollowUpTo: nextFollowUpTo || undefined,
                  }).then((blob) => triggerBlobDownload(blob, 'enquiries.csv'))
                }}
              >
                Export CSV
              </Button>
            </Can>
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </>
        }
      >
        <Input
          label="Search"
          value={search}
          onChange={(e) => setFilter({ q: e.target.value || null })}
          placeholder="Enquiry #, customer, requirement"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setFilter({ status: e.target.value || null })}
          options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
        />
        <Select
          label="Stage"
          value={stageCode}
          onChange={(e) => setFilter({ stage: e.target.value || null })}
          options={[
            { value: '', label: 'All stages' },
            ...stages.map((stage) => ({ value: stage.code, label: stage.name })),
          ]}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setFilter({ priority: e.target.value || null })}
          options={[{ value: '', label: 'All priorities' }, ...PRIORITY_OPTIONS]}
        />
        <Select
          label="Staff"
          value={assignedToId}
          onChange={(e) => setFilter({ staff: e.target.value || null })}
          options={staffOptions}
        />
        <Select
          label="Source"
          value={source}
          onChange={(e) => setFilter({ source: e.target.value || null })}
          options={[{ value: '', label: 'All sources' }, ...SOURCE_OPTIONS]}
        />
        <Select
          label="Overdue"
          value={overdue}
          onChange={(e) => setFilter({ overdue: e.target.value || null })}
          options={[
            { value: '', label: 'Any' },
            { value: 'true', label: 'Overdue only' },
            { value: 'false', label: 'Not overdue' },
          ]}
        />
        <Input
          label="Product"
          value={productName}
          onChange={(e) => setFilter({ product: e.target.value || null })}
          placeholder="Product / category"
        />
        <Input
          label="Due from"
          type="date"
          value={dueFrom}
          onChange={(e) => setFilter({ dueFrom: e.target.value || null })}
        />
        <Input
          label="Due to"
          type="date"
          value={dueTo}
          onChange={(e) => setFilter({ dueTo: e.target.value || null })}
        />
        <Input
          label="Next follow-up from"
          type="date"
          value={nextFollowUpFrom}
          onChange={(e) => setFilter({ followFrom: e.target.value || null })}
        />
        <Input
          label="Next follow-up to"
          type="date"
          value={nextFollowUpTo}
          onChange={(e) => setFilter({ followTo: e.target.value || null })}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={(e) => setFilter({ sort: e.target.value || null }, false)}
          options={[
            { value: 'updatedAt_desc', label: 'Updated (newest)' },
            { value: 'dueDate_asc', label: 'Due date (soonest)' },
            { value: 'priority_desc', label: 'Priority' },
            { value: 'enquiryNumber_asc', label: 'Enquiry #' },
            { value: 'createdAt_desc', label: 'Created (newest)' },
          ]}
        />
        <Input
          label="From date"
          type="date"
          value={fromDate}
          onChange={(e) => setFilter({ from: e.target.value || null })}
        />
        <Input
          label="To date"
          type="date"
          value={toDate}
          onChange={(e) => setFilter({ to: e.target.value || null })}
        />
        <Input
          label="Customer ID"
          value={customerId}
          onChange={(e) => setFilter({ customer: e.target.value || null })}
          placeholder="Optional UUID filter"
        />
      </FilterBar>

      {loading ? <LoadingState label="Loading enquiries…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No enquiries found"
          description="Adjust filters or create a new enquiry."
        />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="mb-3 hidden md:block">
            <Table
              rows={rows.map((row) => ({ ...row, id: row.id }))}
              columns={[
                {
                  key: 'number',
                  header: 'Enquiry #',
                  render: (row) => (
                    <Link className="font-medium hover:underline" to={`/enquiries/${row.id}`}>
                      {row.enquiryNumber}
                    </Link>
                  ),
                },
                {
                  key: 'customer',
                  header: 'Customer',
                  render: (row) => row.customer.companyName,
                },
                {
                  key: 'requirement',
                  header: 'Requirement',
                  render: (row) => (
                    <span>
                      <span className="font-medium">{row.title}</span>
                      {row.productName ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{row.productName}</span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: 'stage',
                  header: 'Stage',
                  render: (row) => row.stage?.name ?? row.stageLabel ?? '—',
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (row) => <PriorityBadge priority={row.priority} overdue={row.isOverdue} />,
                },
                {
                  key: 'assigned',
                  header: 'Assigned To',
                  render: (row) => row.assignedTo?.name ?? 'Unassigned',
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) =>
                    closedStatuses.has(row.status) ? (
                      <span className="text-xs text-slate-400">Closed</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Can permission="enquiries.comment">
                          <Button size="sm" variant="secondary" onClick={() => openAction('respond', row)}>
                            Respond
                          </Button>
                        </Can>
                        <Can permission="enquiries.complete">
                          <Button size="sm" onClick={() => openAction('close', row)}>
                            Close
                          </Button>
                        </Can>
                      </div>
                    ),
                },
                {
                  key: 'followup',
                  header: 'Next Follow-up',
                  render: (row) =>
                    row.nextActionAt ? formatDubaiDateTime(row.nextActionAt) : '—',
                },
                {
                  key: 'due',
                  header: 'Due',
                  render: (row) => (row.dueDate ? formatDubaiDate(row.dueDate) : '—'),
                },
                {
                  key: 'updated',
                  header: 'Updated',
                  render: (row) => formatDubaiDateTime(row.updatedAt),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
                },
              ]}
            />
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <Link
                key={row.id}
                to={`/enquiries/${row.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      {row.enquiryNumber}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{row.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{row.customer.companyName}</p>
                  </div>
                  <PriorityBadge priority={row.priority} overdue={row.isOverdue} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>Stage: {row.stage?.name ?? '—'}</span>
                  <span>Owner: {row.assignedTo?.name ?? 'Unassigned'}</span>
                  <span>Due: {row.dueDate ? formatDubaiDate(row.dueDate) : '—'}</span>
                  <span>Updated: {formatDubaiDate(row.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrevious={() => setFilter({ page: String(page - 1) }, false)}
            onNext={() => setFilter({ page: String(page + 1) }, false)}
            label={`${total} result${total === 1 ? '' : 's'} · Page ${page} of ${totalPages}`}
          />
        </>
      ) : null}

      <Modal
        open={action !== null}
        title={action?.type === 'close' ? 'Close enquiry' : 'Respond'}
        onClose={() => {
          if (!actionBusy) setAction(null)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAction(null)} disabled={actionBusy}>
              Cancel
            </Button>
            <Button busy={actionBusy} onClick={() => void submitAction()}>
              {action?.type === 'close' ? 'Close enquiry' : 'Save response'}
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          {action?.row.enquiryNumber} · {action?.row.title}
          {action?.type === 'respond'
            ? ' This note is saved on the enquiry. New enquiries also move to Contacted.'
            : ' This marks the enquiry completed.'}
        </p>
        <Textarea
          label={action?.type === 'close' ? 'Close note' : 'Response'}
          value={actionNote}
          onChange={(e) => setActionNote(e.target.value)}
          rows={4}
        />
        {actionError ? <p className="mt-2 text-sm text-rose-700">{actionError}</p> : null}
      </Modal>
    </div>
  )
}
