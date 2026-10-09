import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { FilterBar } from '@/components/ui/FilterBar'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Can } from '@/components/Can'
import { PriorityBadge } from '@/features/enquiries/EnquiryShared'
import { ORDINARY_STAGE_CODES, PRIORITY_OPTIONS } from '@/features/enquiries/enquiryFormUtils'
import { ApiError } from '@/services/apiClient'
import {
  changeEnquiryStage,
  getEnquiryBoard,
  listEnquiryStages,
  type BoardColumn,
  type EnquiryListItem,
  type EnquiryPriority,
  type EnquiryStage,
} from '@/services/enquiryService'
import { listStaff, type StaffMember } from '@/services/staffService'
import { formatDubaiDate, formatDubaiDateTime } from '@/utils/date'

/**
 * Board is DnD-ready via explicit stage-change confirm modal.
 * Visual column moves only stick after backend success.
 */
export function EnquiryBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [ungrouped, setUngrouped] = useState<EnquiryListItem[]>([])
  const [stages, setStages] = useState<EnquiryStage[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{
    enquiry: EnquiryListItem
    targetStageCode: string
    columnKey: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const search = searchParams.get('q') ?? ''
  const assignedToId = searchParams.get('staff') ?? ''
  const priority = (searchParams.get('priority') ?? '') as EnquiryPriority | ''
  const stageCode = searchParams.get('stage') ?? ''
  const overdue = searchParams.get('overdue') ?? ''
  const customerId = searchParams.get('customer') ?? ''

  const setFilter = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [board, stageResult, staffResult] = await Promise.all([
        getEnquiryBoard({
          search: search.trim() || undefined,
          assignedToId: assignedToId || undefined,
          priority: priority || undefined,
          stageCode: stageCode || undefined,
          overdue: overdue === '' ? undefined : overdue === 'true',
          customerId: customerId || undefined,
        }),
        listEnquiryStages(),
        listStaff({ pageSize: 100, isActive: true }).catch(() => ({ data: [] as StaffMember[] })),
      ])
      setColumns(board.data.columns)
      setUngrouped(board.data.ungrouped)
      setStages(stageResult.data)
      setStaff(staffResult.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load board')
    } finally {
      setLoading(false)
    }
  }, [search, assignedToId, priority, stageCode, overdue, customerId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [load])

  const ordinaryStages = useMemo(
    () =>
      stages.filter((stage) => (ORDINARY_STAGE_CODES as readonly string[]).includes(stage.code)),
    [stages],
  )

  async function confirmMove() {
    if (!pendingMove) return
    setBusy(true)
    setActionError(null)
    try {
      await changeEnquiryStage(pendingMove.enquiry.id, {
        stageCode: pendingMove.targetStageCode,
      })
      setPendingMove(null)
      await load()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Stage change failed — board restored')
    } finally {
      setBusy(false)
    }
  }

  function CardView({ item }: { item: EnquiryListItem }) {
    return (
      <Link
        to={`/enquiries/${item.id}`}
        className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              {item.enquiryNumber}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{item.customer.companyName}</p>
            <p className="mt-1 text-sm text-slate-700">{item.title}</p>
          </div>
          <PriorityBadge priority={item.priority} overdue={item.isOverdue} />
        </div>
        <div className="mt-2 space-y-1 text-xs text-slate-500">
          <p>Owner: {item.assignedTo?.name ?? 'Unassigned'}</p>
          <p>
            Follow-up:{' '}
            {item.nextActionAt ? formatDubaiDateTime(item.nextActionAt) : '—'}
          </p>
          <p>Due: {item.dueDate ? formatDubaiDate(item.dueDate) : '—'}</p>
        </div>
        <Can permission="enquiries.change_stage">
          <div className="mt-2">
            <select
              className="w-full min-h-9 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/8"
              value=""
              onClick={(e) => e.preventDefault()}
              onChange={(e) => {
                e.preventDefault()
                const value = e.target.value
                if (!value) return
                setPendingMove({
                  enquiry: item,
                  targetStageCode: value,
                  columnKey: item.stage?.code ?? '',
                })
              }}
            >
              <option value="">Move stage…</option>
              {ordinaryStages.map((stage) => (
                <option key={stage.code} value={stage.code}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
        </Can>
      </Link>
    )
  }

  return (
    <div>
      <PageHeader
        title="Enquiry board"
        description="Pipeline view grouped for trading CRM. Stage moves confirm with the API before sticking."
        breadcrumb={
          <span>
            Home / <Link to="/enquiries">Enquiries</Link> / Board
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/enquiries" variant="secondary">
              List view
            </ButtonLink>
            <Can permission="enquiries.create">
              <ButtonLink to="/enquiries/new">New enquiry</ButtonLink>
            </Can>
          </div>
        }
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => setSearchParams({}, { replace: true })}>
            Clear filters
          </Button>
        }
      >
        <Input
          label="Search"
          value={search}
          onChange={(e) => setFilter({ q: e.target.value || null })}
          placeholder="Enquiry / customer"
        />
        <Select
          label="Staff"
          value={assignedToId}
          onChange={(e) => setFilter({ staff: e.target.value || null })}
          options={[
            { value: '', label: 'All staff' },
            ...staff.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setFilter({ priority: e.target.value || null })}
          options={[{ value: '', label: 'All priorities' }, ...PRIORITY_OPTIONS]}
        />
        <Select
          label="Stage"
          value={stageCode}
          onChange={(e) => setFilter({ stage: e.target.value || null })}
          options={[
            { value: '', label: 'All stages' },
            ...stages.map((s) => ({ value: s.code, label: s.name })),
          ]}
        />
        <Select
          label="Overdue"
          value={overdue}
          onChange={(e) => setFilter({ overdue: e.target.value || null })}
          options={[
            { value: '', label: 'Any' },
            { value: 'true', label: 'Overdue only' },
          ]}
        />
        <Input
          label="Customer ID"
          value={customerId}
          onChange={(e) => setFilter({ customer: e.target.value || null })}
        />
      </FilterBar>

      {loading ? <LoadingState label="Loading board…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3 px-1">
            {columns.map((column) => (
              <section
                key={column.key}
                className="w-[280px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50"
              >
                <header className="border-b border-slate-200 px-3 py-3">
                  <h3 className="text-sm font-semibold text-slate-900">{column.label}</h3>
                  <p className="text-xs text-slate-500">{column.items.length} enquiries</p>
                </header>
                <div className="space-y-2 p-2">
                  {column.items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-slate-400">Empty</p>
                  ) : (
                    column.items.map((item) => <CardView key={item.id} item={item} />)
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && ungrouped.length > 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Ungrouped enquiries"
            description={`${ungrouped.length} item(s) are outside the default board columns (e.g. LOST).`}
          />
        </div>
      ) : null}

      <Modal
        open={pendingMove != null}
        title="Confirm stage change"
        onClose={() => {
          setPendingMove(null)
          setActionError(null)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setPendingMove(null)
                setActionError(null)
              }}
            >
              Cancel
            </Button>
            <Button disabled={busy} busy={busy} onClick={() => void confirmMove()}>
              {busy ? 'Saving…' : 'Confirm with API'}
            </Button>
          </div>
        }
      >
        {pendingMove ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Move <strong>{pendingMove.enquiry.enquiryNumber}</strong> to{' '}
              <strong>{pendingMove.targetStageCode}</strong>?
            </p>
            <p className="text-slate-500">
              The board only updates after the backend accepts the transition. Terminal stages
              (Completed / Lost / Cancelled) must use dedicated actions on the detail page.
            </p>
            {actionError ? <p className="text-rose-700">{actionError}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
