import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import {
  groupOccurrencesByEvent,
  occurrenceStatusLabel,
  recurrenceLabel,
  statusTone,
} from '@/features/reminders/reminderFormUtils'
import { ApiError } from '@/services/apiClient'
import {
  cancelReminder,
  completeOccurrence,
  completeReminder,
  getReminder,
  type ReminderDetail,
  type ReminderSendNowResult,
} from '@/services/reminderService'
import { dubaiToday, formatDubaiDate, formatDubaiDateTime, formatDubaiTime } from '@/utils/date'

export function ReminderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const sendNowResult = (location.state as { sendNow?: ReminderSendNowResult | null } | null)?.sendNow
  const [detail, setDetail] = useState<ReminderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'complete' | 'cancel' | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getReminder(id)
      setDetail(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load reminder')
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

  async function runAction() {
    if (!id || !confirm) return
    setBusy(true)
    try {
      if (confirm === 'complete') await completeReminder(id)
      else await cancelReminder(id)
      setConfirm(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed')
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  const eventGroups = useMemo(
    () => (detail ? groupOccurrencesByEvent(detail.occurrences) : []),
    [detail],
  )

  if (loading) return <LoadingState label="Loading reminder…" />
  if (error && !detail) return <ErrorState message={error} onRetry={() => void load()} />
  if (!detail) return <EmptyState title="Not found" description="This reminder does not exist." />

  const today = dubaiToday()
  const canMutate = detail.status === 'ACTIVE' || detail.status === 'PAUSED'
  const eventTime = formatDubaiTime(detail.eventTime)
  const upcoming = eventGroups.filter((row) => row.eventDate >= today).slice(0, 8)
  const historyStart = eventGroups.findIndex((row) => row.eventDate >= today)
  const historyFrom = Math.max(0, (historyStart === -1 ? eventGroups.length : historyStart) - 8)
  const history = eventGroups.slice(historyFrom, historyFrom + 40)
  const savedDetails = [detail.personName, detail.referenceCode, detail.description, detail.notes].some(Boolean)
  const sendNowMessage = sendNowResult
    ? sendNowResult.failed > 0 && sendNowResult.sent === 0
      ? `WhatsApp was not sent. ${sendNowResult.results.map((row) => row.errorMessage).filter(Boolean).join('; ') || 'No recipient phone.'}`
      : sendNowResult.failed > 0
        ? `WhatsApp sent to ${sendNowResult.sent}. ${sendNowResult.failed} failed.`
        : `WhatsApp sent to ${sendNowResult.sent}.`
    : null

  async function markDateDone(ids: string[]) {
    setBusy(true)
    setError(null)
    try {
      for (const occurrenceId of ids) {
        await completeOccurrence(occurrenceId)
      }
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update this date')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {sendNowMessage ? (
        <div
          className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
            sendNowResult && sendNowResult.sent > 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {sendNowMessage}
        </div>
      ) : null}
      <PageHeader
        title={detail.title}
        description={`${formatDubaiDate(detail.eventDate)}${eventTime ? ` at ${eventTime}` : ''} · ${recurrenceLabel(detail.recurrenceType, detail.recurrenceInterval)}`}
        breadcrumb={<span>Home / Reminders / Detail</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/reminders')}>
              Back
            </Button>
            <Can permission="reminders.update">
              {canMutate ? (
                <ButtonLink to={`/reminders/${detail.id}/edit`} variant="secondary">
                  Edit
                </ButtonLink>
              ) : null}
            </Can>
            <Can permission="reminders.complete">
              {canMutate ? <Button onClick={() => setConfirm('complete')}>Acknowledge</Button> : null}
            </Can>
            <Can permission="reminders.delete">
              {canMutate ? (
                <Button variant="danger" onClick={() => setConfirm('cancel')}>
                  Cancel
                </Button>
              ) : null}
            </Can>
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mb-4">
        <Card>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Date and time</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {formatDubaiDate(detail.eventDate)}
                {eventTime ? ` at ${eventTime}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Repeats</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {recurrenceLabel(detail.recurrenceType, detail.recurrenceInterval)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Staff</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{detail.ownerUser?.name || 'Unassigned'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mb-4">
        <Card title="Upcoming dates" description="The next times this event happens.">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming dates.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((row) => (
                <li key={row.eventDate} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                  <span className="font-medium text-slate-900">
                    {formatDubaiDate(row.eventDate)}
                    {eventTime ? <span className="font-normal text-slate-500"> · {eventTime}</span> : null}
                  </span>
                  <span className="text-slate-500">{row.remindOn}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-4">
        <Card
          title="Dates"
          description={
            eventGroups.length > history.length
              ? `Showing ${history.length} of ${eventGroups.length} event dates.`
              : 'One row for each chosen date.'
          }
        >
          <Table
            rows={history}
            empty={<EmptyState title="No dates yet" description="Saving the reminder creates its dates." />}
            columns={[
              {
                key: 'event',
                header: 'Event date',
                render: (row) => formatDubaiDate(row.eventDate),
              },
              {
                key: 'time',
                header: 'Time',
                render: () => eventTime || '—',
              },
              {
                key: 'remind',
                header: 'Remind on',
                render: (row) => row.remindOn,
              },
              {
                key: 'staff',
                header: 'Staff',
                render: () => detail.ownerUser?.name || 'Unassigned',
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <Badge tone={statusTone(row.status)}>{occurrenceStatusLabel(row.status)}</Badge>,
              },
              {
                key: 'actions',
                header: '',
                render: (row) =>
                  row.pendingIds.length > 0 ? (
                    <Can permission="reminders.complete">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        busy={busy}
                        onClick={() => void markDateDone(row.pendingIds)}
                      >
                        Done
                      </Button>
                    </Can>
                  ) : null,
              },
            ]}
          />
        </Card>
      </div>

      {savedDetails ? (
        <div className="mb-4">
          <Card title="Saved details">
            <dl className="space-y-2 text-sm">
              {detail.personName ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Person</dt>
                  <dd>{detail.personName}</dd>
                </div>
              ) : null}
              {detail.referenceCode ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Reference</dt>
                  <dd>{detail.referenceCode}</dd>
                </div>
              ) : null}
              {detail.description ? <p className="text-slate-700">{detail.description}</p> : null}
              {detail.notes ? <p className="whitespace-pre-wrap text-slate-600">{detail.notes}</p> : null}
            </dl>
          </Card>
        </div>
      ) : null}

      <div className="mb-4">
        <Card title="Messages" description="WhatsApp messages sent for this reminder.">
          {(detail.notificationHistory?.length ?? 0) === 0 ? (
            <EmptyState title="No messages yet" description="Sent reminders will appear here." />
          ) : (
            <Table
              rows={detail.notificationHistory.map((row) => ({ ...row, id: row.id }))}
              columns={[
                {
                  key: 'when',
                  header: 'When',
                  render: (row) => formatDubaiDateTime(row.sentAt ?? row.createdAt),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (row) =>
                    row.messageType === 'DAILY_SUMMARY'
                      ? 'Daily summary'
                      : row.messageType === 'MANUAL'
                        ? 'Manual'
                        : 'Reminder',
                },
                {
                  key: 'recipient',
                  header: 'Recipient',
                  render: (row) => row.recipientName || row.recipientPhoneMasked || '—',
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <span
                      className={
                        row.status === 'FAILED'
                          ? 'text-rose-700'
                          : row.status === 'DELIVERED' || row.status === 'READ'
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                      }
                    >
                      {row.status === 'DELIVERED' || row.status === 'READ'
                        ? 'Delivered'
                        : row.status === 'FAILED'
                          ? 'Failed'
                          : row.status}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>

      <Card title="Activity">
        {detail.auditTrail.length === 0 ? (
          <EmptyState title="No activity yet" description="Changes to this reminder will appear here." />
        ) : (
          <ul className="space-y-3">
            {detail.auditTrail.map((item) => (
              <li key={item.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{item.action}</span>
                  <span className="text-xs text-slate-500">{formatDubaiDateTime(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-slate-600">{item.actorName}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'complete' ? 'Acknowledge reminder?' : 'Cancel reminder?'}
        message={
          confirm === 'complete'
            ? 'This marks the reminder as done and keeps the dates.'
            : 'This stops future reminders. Dates already sent stay in the history.'
        }
        confirmLabel={confirm === 'complete' ? 'Acknowledge' : 'Cancel reminder'}
        danger={confirm === 'cancel'}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runAction()}
      />
    </div>
  )
}
