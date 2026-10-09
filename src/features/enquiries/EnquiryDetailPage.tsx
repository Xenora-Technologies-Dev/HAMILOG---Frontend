import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Can } from '@/components/Can'
import { PriorityBadge } from '@/features/enquiries/EnquiryShared'
import { EnquiryTimeline } from '@/features/enquiries/EnquiryTimeline'
import {
  ORDINARY_STAGE_CODES,
  statusTone,
} from '@/features/enquiries/enquiryFormUtils'
import { usePermissions } from '@/hooks/usePermissions'
import { ApiError } from '@/services/apiClient'
import {
  addEnquiryComment,
  addEnquiryFollowUp,
  assignEnquiry,
  cancelEnquiry,
  changeEnquiryStage,
  completeEnquiry,
  createEnquiryLinkedReminder,
  deleteEnquiryAttachment,
  downloadEnquiryAttachment,
  getEnquiry,
  holdEnquiry,
  listEnquiryStages,
  markEnquiryLost,
  reopenEnquiry,
  unassignEnquiry,
  updateEnquiry,
  uploadEnquiryAttachment,
  type EnquiryDetail,
  type EnquiryStage,
  type FollowUpPayload,
} from '@/services/enquiryService'
import { listStaff, type StaffMember } from '@/services/staffService'
import { formatDubaiDate, formatDubaiDateTime } from '@/utils/date'

type ActionModal =
  | { type: 'assign' | 'reassign' }
  | { type: 'stage' }
  | { type: 'followup' }
  | { type: 'comment' }
  | { type: 'complete' }
  | { type: 'lost' }
  | { type: 'cancel' }
  | { type: 'hold' }
  | { type: 'reopen' }
  | { type: 'reminder' }
  | { type: 'edit' }
  | null

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value?.trim() ? value : '—'}</p>
    </div>
  )
}

export function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { can } = usePermissions()
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null)
  const [stages, setStages] = useState<EnquiryStage[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [modal, setModal] = useState<ActionModal>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [assigneeId, setAssigneeId] = useState('')
  const [reason, setReason] = useState('')
  const [stageCode, setStageCode] = useState('')
  const [nextActionAt, setNextActionAt] = useState('')
  const [nextActionNote, setNextActionNote] = useState('')
  const [activityType, setActivityType] = useState<NonNullable<FollowUpPayload['activityType']>>(
    'CUSTOMER_CALL',
  )
  const [outcome, setOutcome] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [followUpComment, setFollowUpComment] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState('MEDIUM')
  const [reminderDate, setReminderDate] = useState('')
  const [timelineKey, setTimelineKey] = useState(0)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setForbidden(false)
    try {
      const [detail, stageResult, staffResult] = await Promise.all([
        getEnquiry(id),
        listEnquiryStages(),
        listStaff({ pageSize: 100, isActive: true }).catch(() => ({ data: [] as StaffMember[] })),
      ])
      setEnquiry(detail.data)
      setStages(stageResult.data)
      setStaff(staffResult.data.filter((s) => s.isAssignable))
      setEditTitle(detail.data.title)
      setEditPriority(detail.data.priority)
      setStageCode(detail.data.stage?.code ?? '')
      setAssigneeId(detail.data.assignedTo?.id ?? '')
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setForbidden(true)
        setError(err.message)
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to load enquiry')
      }
      setEnquiry(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const ordinaryStages = useMemo(
    () =>
      stages.filter((stage) =>
        (ORDINARY_STAGE_CODES as readonly string[]).includes(stage.code),
      ),
    [stages],
  )

  const isTerminal = Boolean(enquiry?.stage?.isTerminal)

  function openModal(next: ActionModal) {
    setActionError(null)
    setReason('')
    setNextActionAt('')
    setNextActionNote('')
    setOutcome('')
    setContactPerson(enquiry?.contactPerson ?? '')
    setFollowUpComment('')
    setActivityType('CUSTOMER_CALL')
    setCommentBody('')
    setReminderDate('')
    if (enquiry) {
      setAssigneeId(enquiry.assignedTo?.id ?? '')
      setStageCode(enquiry.stage?.code ?? '')
      setEditTitle(enquiry.title)
      setEditPriority(enquiry.priority)
    }
    setModal(next)
  }

  async function runAction(runner: () => Promise<unknown>) {
    setBusy(true)
    setActionError(null)
    try {
      await runner()
      setModal(null)
      await load()
      setTimelineKey((k) => k + 1)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitModal(event: FormEvent) {
    event.preventDefault()
    if (!enquiry || !modal) return

    if (modal.type === 'assign' || modal.type === 'reassign') {
      if (!assigneeId) {
        setActionError('Select a staff member')
        return
      }
      await runAction(() => assignEnquiry(enquiry.id, { assigneeId, reason: reason || undefined }))
      return
    }
    if (modal.type === 'stage') {
      if (!stageCode) {
        setActionError('Select a stage')
        return
      }
      await runAction(() =>
        changeEnquiryStage(enquiry.id, {
          stageCode,
          reason: reason || undefined,
        }),
      )
      return
    }
    if (modal.type === 'followup') {
      if (!nextActionAt || !nextActionNote.trim() || !outcome.trim()) {
        setActionError('Outcome, next action, and follow-up date/time are required')
        return
      }
      await runAction(() =>
        addEnquiryFollowUp(enquiry.id, {
          activityType,
          contactPerson: contactPerson || undefined,
          outcome: outcome.trim(),
          comment: followUpComment.trim() || undefined,
          nextAction: nextActionNote.trim(),
          nextActionAt: nextActionAt.includes('T')
            ? new Date(nextActionAt).toISOString()
            : `${nextActionAt}T09:00:00.000Z`,
        }),
      )
      return
    }
    if (modal.type === 'comment') {
      if (!commentBody.trim()) {
        setActionError('Comment cannot be empty')
        return
      }
      await runAction(() => addEnquiryComment(enquiry.id, { body: commentBody.trim() }))
      return
    }
    if (modal.type === 'complete') {
      if (reason.trim().length < 2) {
        setActionError('Completion outcome is required')
        return
      }
      await runAction(() => completeEnquiry(enquiry.id, { note: reason.trim() }))
      return
    }
    if (modal.type === 'lost') {
      if (reason.trim().length < 2) {
        setActionError('Lost reason is required')
        return
      }
      await runAction(() => markEnquiryLost(enquiry.id, { reason: reason.trim() }))
      return
    }
    if (modal.type === 'cancel') {
      if (reason.trim().length < 2) {
        setActionError('Cancellation reason is required')
        return
      }
      await runAction(() => cancelEnquiry(enquiry.id, { reason: reason.trim() }))
      return
    }
    if (modal.type === 'hold') {
      await runAction(() =>
        holdEnquiry(enquiry.id, {
          reason: reason || undefined,
          nextActionAt: nextActionAt || undefined,
          nextActionNote: nextActionNote || undefined,
        }),
      )
      return
    }
    if (modal.type === 'reopen') {
      if (reason.trim().length < 2) {
        setActionError('Reopen reason is required')
        return
      }
      await runAction(() =>
        reopenEnquiry(enquiry.id, {
          reason: reason.trim(),
          stageCode: stageCode || 'ASSIGNED',
        }),
      )
      return
    }
    if (modal.type === 'reminder') {
      if (!reminderDate) {
        setActionError('Reminder date is required')
        return
      }
      await runAction(() =>
        createEnquiryLinkedReminder(enquiry.id, {
          eventDate: reminderDate,
          notes: reason || undefined,
        }),
      )
      return
    }
    if (modal.type === 'edit') {
      await runAction(() =>
        updateEnquiry(enquiry.id, {
          title: editTitle.trim(),
          priority: editPriority as EnquiryDetail['priority'],
        }),
      )
    }
  }

  if (loading) return <LoadingState label="Loading enquiry…" />
  if (forbidden) {
    return (
      <div>
        <PageHeader title="Permission denied" breadcrumb={<span>Home / Enquiries</span>} />
        <ErrorState message={error ?? 'You do not have access to this enquiry.'} />
      </div>
    )
  }
  if (error && !enquiry) {
    return (
      <div>
        <PageHeader title="Enquiry" breadcrumb={<span>Home / Enquiries</span>} />
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }
  if (!enquiry) {
    return <EmptyState title="Enquiry not found" description="It may have been deleted." />
  }

  const modalTitle =
    modal?.type === 'assign'
      ? 'Assign enquiry'
      : modal?.type === 'reassign'
        ? 'Reassign enquiry'
        : modal?.type === 'stage'
          ? 'Change stage'
          : modal?.type === 'followup'
            ? 'Add follow-up'
            : modal?.type === 'comment'
              ? 'Add comment'
              : modal?.type === 'complete'
                ? 'Complete enquiry'
                : modal?.type === 'lost'
                  ? 'Mark lost'
                  : modal?.type === 'cancel'
                    ? 'Cancel enquiry'
                    : modal?.type === 'hold'
                      ? 'Put on hold'
                      : modal?.type === 'reopen'
                        ? 'Reopen enquiry'
                        : modal?.type === 'reminder'
                          ? 'Add reminder'
                          : modal?.type === 'edit'
                            ? 'Edit enquiry'
                            : ''

  return (
    <div>
      <PageHeader
        title={enquiry.enquiryNumber}
        description={enquiry.title}
        breadcrumb={
          <span>
            Home / <Link to="/enquiries">Enquiries</Link> / {enquiry.enquiryNumber}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Can permission="enquiries.update">
              <Button variant="secondary" onClick={() => openModal({ type: 'edit' })} disabled={isTerminal}>
                Edit
              </Button>
            </Can>
            <ButtonLink to="/enquiries/board" variant="secondary">
              Board
            </ButtonLink>
          </div>
        }
      />

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{enquiry.customer.companyName}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{enquiry.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <PriorityBadge priority={enquiry.priority} overdue={enquiry.isOverdue} />
              <Badge tone="neutral">Stage · {enquiry.stage?.name ?? enquiry.stageLabel ?? '—'}</Badge>
              <Badge tone={statusTone(enquiry.status)}>Status · {enquiry.status}</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Current stage</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {enquiry.stage?.name ?? enquiry.stageLabel ?? '—'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase">Last activity</p>
            <p className="mt-1 text-sm text-slate-900">
              {enquiry.lastActivitySummary?.trim() || 'No activity recorded yet'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase">Next action</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {enquiry.nextActionNote?.trim() || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase">Next follow-up</p>
            <p className="mt-1 text-sm text-slate-900">
              {enquiry.nextActionAt ? formatDubaiDateTime(enquiry.nextActionAt) : '—'}
              {enquiry.isOverdue ? (
                <span className="ml-2 inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-800">
                  Overdue
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Can permission="enquiries.update">
          <Button size="sm" variant="secondary" onClick={() => openModal({ type: 'followup' })} disabled={isTerminal}>
            Add follow-up
          </Button>
        </Can>
        <Can permission="enquiries.change_stage">
          <Button size="sm" variant="secondary" onClick={() => openModal({ type: 'stage' })} disabled={isTerminal}>
            Change stage
          </Button>
        </Can>
        <Can anyOf={['enquiries.assign', 'enquiries.reassign']}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openModal({ type: enquiry.assignedTo ? 'reassign' : 'assign' })}
            disabled={isTerminal}
          >
            {enquiry.assignedTo ? 'Reassign' : 'Assign'}
          </Button>
        </Can>
        <Can permission="enquiries.comment">
          <Button size="sm" variant="secondary" onClick={() => openModal({ type: 'comment' })}>
            Add comment
          </Button>
        </Can>
        <Can permission="reminders.create">
          <Button size="sm" variant="secondary" onClick={() => openModal({ type: 'reminder' })}>
            Add reminder
          </Button>
        </Can>
        <Can permission="enquiries.complete">
          <Button size="sm" onClick={() => openModal({ type: 'complete' })} disabled={isTerminal}>
            Complete
          </Button>
          <Button size="sm" variant="danger" onClick={() => openModal({ type: 'lost' })} disabled={isTerminal}>
            Mark lost
          </Button>
          <Button size="sm" variant="danger" onClick={() => openModal({ type: 'cancel' })} disabled={isTerminal}>
            Cancel
          </Button>
        </Can>
        <Can permission="enquiries.change_stage">
          <Button size="sm" variant="secondary" onClick={() => openModal({ type: 'hold' })} disabled={isTerminal}>
            On hold
          </Button>
        </Can>
        {isTerminal ? (
          <Can permission="enquiries.complete">
            <Button size="sm" onClick={() => openModal({ type: 'reopen' })}>
              Reopen
            </Button>
          </Can>
        ) : null}
        {enquiry.assignedTo && can('enquiries.reassign') ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || isTerminal}
            onClick={() =>
              void runAction(() => unassignEnquiry(enquiry.id, { reason: 'Unassigned from detail' }))
            }
          >
            Unassign
          </Button>
        ) : null}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card title="Summary">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Assigned staff" value={enquiry.assignedTo?.name} />
            <Field label="Created by" value={enquiry.createdBy.name} />
            <Field label="Created" value={formatDubaiDateTime(enquiry.createdAt)} />
            <Field label="Due date" value={enquiry.dueDate ? formatDubaiDate(enquiry.dueDate) : null} />
            <Field
              label="Next follow-up"
              value={enquiry.nextActionAt ? formatDubaiDateTime(enquiry.nextActionAt) : null}
            />
            <Field label="Next action" value={enquiry.nextActionNote} />
            <Field label="Source" value={enquiry.source} />
            <Field label="Contact" value={enquiry.contactPerson} />
          </div>
        </Card>

        <Card title="Requirement">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product / category" value={enquiry.productCategory} />
            <Field label="Product" value={enquiry.productName} />
            <Field
              label="Quantity"
              value={[enquiry.quantity, enquiry.unit].filter(Boolean).join(' ')}
            />
            <Field label="Brand" value={enquiry.brand} />
            <Field label="Size / dimension" value={enquiry.sizeDimension} />
            <Field label="Delivery location" value={enquiry.deliveryLocation} />
            <Field
              label="Required delivery"
              value={
                enquiry.requiredDeliveryDate
                  ? formatDubaiDate(enquiry.requiredDeliveryDate)
                  : null
              }
            />
          </div>
          <div className="mt-3">
            <Field label="Specification" value={enquiry.specification || enquiry.description} />
          </div>
        </Card>

        <Card title="Workflow notes">
          <div className="grid gap-3">
            <Field label="Lost reason" value={enquiry.lostReason} />
            <Field label="Cancelled reason" value={enquiry.cancelledReason} />
            <Field label="On hold reason" value={enquiry.onHoldReason} />
            <Field
              label="Completed by"
              value={
                enquiry.completedBy
                  ? `${enquiry.completedBy.name}${enquiry.completedAt ? ` · ${formatDubaiDateTime(enquiry.completedAt)}` : ''}`
                  : null
              }
            />
            <Field label="Reopen reason" value={enquiry.reopenReason} />
          </div>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Card title="Stage history" description="Old → new, who, when.">
          {enquiry.stageHistory.length === 0 ? (
            <EmptyState
              title="No stage changes yet"
              description="Stage transitions will appear here as the enquiry moves through the pipeline."
            />
          ) : (
            <ul className="space-y-3">
              {enquiry.stageHistory.map((row) => (
                <li key={row.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                  <p className="font-medium text-slate-800">
                    {row.fromStageCode ?? '—'} → {row.toStageCode}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {row.changedBy.name} · {formatDubaiDateTime(row.changedAt)}
                  </p>
                  {row.reason ? <p className="mt-1 text-slate-500">{row.reason}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Comments">
          {enquiry.comments.length === 0 ? (
            <EmptyState
              title="No comments yet"
              description="Internal notes and comments will show here."
            />
          ) : (
            <ul className="space-y-3">
              {enquiry.comments.map((row) => (
                <li key={row.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                  <p className="font-medium text-slate-800">{row.author.name}</p>
                  <p className="mt-1 text-slate-700">{row.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDubaiDateTime(row.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-4">
        <Card
          title="Activity timeline"
          description="Chronological follow-ups, comments, stage and assignment history."
        >
          <EnquiryTimeline key={timelineKey} enquiryId={enquiry.id} />
        </Card>
      </div>

      <div className="mb-4">
        <Card title="Attachments" description="PDF, images, Excel, Word — executables blocked.">
        <Can anyOf={['enquiries.attach', 'enquiries.update']}>
          <div className="mb-3">
            <input
              type="file"
              disabled={uploading || isTerminal}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                setUploading(true)
                void uploadEnquiryAttachment(enquiry.id, file)
                  .then(async () => {
                    await load()
                    setTimelineKey((k) => k + 1)
                  })
                  .catch((err) => {
                    setError(err instanceof ApiError ? err.message : 'Upload failed')
                  })
                  .finally(() => setUploading(false))
              }}
            />
            {uploading ? <p className="mt-1 text-xs text-slate-500">Uploading…</p> : null}
          </div>
        </Can>
        {(enquiry.attachments?.length ?? 0) === 0 ? (
          <EmptyState title="No attachments" description="Upload quotes, specs, or customer files." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {enquiry.attachments?.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{file.originalName}</p>
                  <p className="text-xs text-slate-500">
                    {file.mimeType} · {Math.max(1, Math.round(file.sizeBytes / 1024))} KB ·{' '}
                    {file.uploadedBy.name} · {formatDubaiDateTime(file.uploadedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void downloadEnquiryAttachment(enquiry.id, file.id).then((blob) => {
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = file.originalName
                        a.click()
                        URL.revokeObjectURL(url)
                      })
                    }}
                  >
                    Download
                  </Button>
                  <Can anyOf={['enquiries.attach', 'enquiries.manage_all']}>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        void runAction(() => deleteEnquiryAttachment(enquiry.id, file.id))
                      }
                    >
                      Delete
                    </Button>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        )}
        </Card>
      </div>

      <Modal
        open={modal != null}
        title={modalTitle}
        onClose={() => setModal(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Close
            </Button>
            <Button onClick={(e) => void onSubmitModal(e as unknown as FormEvent)} disabled={busy} busy={busy}>
              {busy ? 'Saving…' : 'Confirm'}
            </Button>
          </div>
        }
      >
        <form className="space-y-3" onSubmit={(e) => void onSubmitModal(e)}>
          {actionError ? <p className="text-sm text-rose-700">{actionError}</p> : null}

          {modal?.type === 'assign' || modal?.type === 'reassign' ? (
            <>
              <Select
                label="Staff"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                options={[
                  { value: '', label: 'Select staff' },
                  ...staff.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Input label="Reason / note" value={reason} onChange={(e) => setReason(e.target.value)} />
            </>
          ) : null}

          {modal?.type === 'stage' || modal?.type === 'reopen' ? (
            <Select
              label="Stage"
              value={stageCode}
              onChange={(e) => setStageCode(e.target.value)}
              options={ordinaryStages.map((s) => ({ value: s.code, label: s.name }))}
            />
          ) : null}

          {modal?.type === 'followup' ? (
            <>
              <Select
                label="Activity type"
                value={activityType}
                onChange={(e) =>
                  setActivityType(e.target.value as NonNullable<FollowUpPayload['activityType']>)
                }
                options={[
                  { value: 'CUSTOMER_CALL', label: 'Customer call' },
                  { value: 'CUSTOMER_WHATSAPP', label: 'Customer WhatsApp' },
                  { value: 'CUSTOMER_EMAIL', label: 'Customer email' },
                  { value: 'CUSTOMER_MEETING', label: 'Customer meeting' },
                  { value: 'SUPPLIER_CONTACT', label: 'Supplier contact' },
                  { value: 'QUOTATION_SENT', label: 'Quotation sent' },
                  { value: 'INTERNAL_NOTE', label: 'Internal note' },
                  { value: 'FOLLOW_UP', label: 'Follow-up' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
              <Input
                label="Contact / person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
              <Input
                label="Outcome *"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Customer requested revised price"
              />
              <Textarea
                value={followUpComment}
                onChange={(e) => setFollowUpComment(e.target.value)}
                placeholder="Comment (optional)"
                rows={3}
              />
              <Input
                label="Next action *"
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
                placeholder="Discuss revised price with supplier"
              />
              <Input
                label="Next follow-up date/time *"
                type="datetime-local"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
              />
            </>
          ) : null}

          {modal?.type === 'hold' ? (
            <>
              <Input
                label="Next follow-up date"
                type="date"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
              />
              <Input
                label="Next action"
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
              />
            </>
          ) : null}

          {modal?.type === 'comment' ? (
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Internal note"
            />
          ) : null}

          {modal?.type === 'lost' ||
          modal?.type === 'cancel' ||
          modal?.type === 'reopen' ||
          modal?.type === 'complete' ||
          modal?.type === 'hold' ||
          modal?.type === 'reminder' ? (
            <Input
              label={
                modal.type === 'lost'
                  ? 'Lost reason *'
                  : modal.type === 'cancel'
                    ? 'Cancellation reason *'
                    : modal.type === 'reopen'
                      ? 'Reopen reason *'
                      : modal.type === 'complete'
                        ? 'Completion outcome *'
                        : 'Note'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          ) : null}

          {modal?.type === 'reminder' ? (
            <Input
              label="Reminder date *"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
            />
          ) : null}

          {modal?.type === 'edit' ? (
            <>
              <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <Select
                label="Priority"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                options={[
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'URGENT', label: 'Urgent' },
                ]}
              />
            </>
          ) : null}
        </form>
      </Modal>
    </div>
  )
}
