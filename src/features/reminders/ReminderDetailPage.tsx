import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import { priorityTone, statusTone } from '@/features/reminders/reminderFormUtils'
import { ApiError } from '@/services/apiClient'
import {
  cancelReminder,
  completeOccurrence,
  completeReminder,
  getReminder,
  type ReminderDetail,
  type ReminderSendNowResult,
} from '@/services/reminderService'
import { formatDubaiDate, formatDubaiDateTime } from '@/utils/date'

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

  if (loading) return <LoadingState label="Loading reminder…" />
  if (error && !detail) return <ErrorState message={error} onRetry={() => void load()} />
  if (!detail) return <EmptyState title="Not found" description="Reminder does not exist." />

  const canMutate = detail.status === 'ACTIVE' || detail.status === 'PAUSED'
  const sendNowMessage = sendNowResult
    ? sendNowResult.failed > 0 && sendNowResult.sent === 0
      ? `WhatsApp send now failed: ${sendNowResult.results.map((row) => row.errorMessage).filter(Boolean).join('; ') || 'no recipient phone'}`
      : sendNowResult.failed > 0
        ? `WhatsApp sent to ${sendNowResult.sent} recipient(s); ${sendNowResult.failed} failed.`
        : `WhatsApp sent now to ${sendNowResult.sent} recipient(s).`
    : null

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
        description={`${detail.category.name} · Event ${formatDubaiDate(detail.eventDate)} (Asia/Dubai)`}
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
              {canMutate ? (
                <Button onClick={() => setConfirm('complete')}>Acknowledge</Button>
              ) : null}
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

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Summary">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd><Badge tone={statusTone(detail.status)}>{detail.status}</Badge></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Priority</dt><dd><Badge tone={priorityTone(detail.priority)}>{detail.priority}</Badge></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Person</dt><dd>{detail.personName || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Reference</dt><dd>{detail.referenceCode || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Owner</dt><dd>{detail.ownerUser?.name || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Recurrence</dt><dd>{detail.recurrenceType}{detail.recurrenceType !== 'NONE' ? ` / ${detail.recurrenceInterval}` : ''}</dd></div>
          </dl>
          {detail.description ? <p className="mt-4 text-sm text-slate-600">{detail.description}</p> : null}
        </Card>

        <Card title="Rules">
          <ul className="space-y-2 text-sm">
            {detail.rules.map((rule) => (
              <li key={rule.id} className="rounded-lg border border-slate-100 px-3 py-2">
                {rule.offsetValue === 0 ? 'Same day' : `${rule.offsetValue} ${rule.offsetUnit.toLowerCase()} before`} at {rule.sendTimeLocal}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recipients">
          {detail.recipients.length === 0 ? (
            <p className="text-sm text-slate-500">No recipients</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detail.recipients.map((r) => (
                <li key={r.id}>
                  {r.user?.name ?? 'Unknown'}{' '}
                  <span className="text-xs text-slate-500">({r.recipientType}{r.isPrimary ? ', primary' : ''})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-4">
        <Card title="Occurrence history" description="System-generated schedule. Historical sent/completed rows are preserved.">
          <Table
            rows={detail.occurrences.map((o) => ({ ...o, id: o.id }))}
            empty={<EmptyState title="No occurrences" description="Rules will generate schedule entries." />}
            columns={[
              {
                key: 'event',
                header: 'Event date',
                render: (o) => formatDubaiDate(o.eventDate),
              },
              {
                key: 'scheduled',
                header: 'Scheduled (Dubai)',
                render: (o) => formatDubaiDateTime(o.scheduledFor),
              },
              {
                key: 'rule',
                header: 'Rule',
                render: (o) =>
                  o.rule.offsetValue === 0
                    ? 'Same day'
                    : `${o.rule.offsetValue} ${o.rule.offsetUnit.toLowerCase()} before`,
              },
              {
                key: 'status',
                header: 'Status',
                render: (o) => <Badge tone={statusTone(o.status)}>{o.status}</Badge>,
              },
              {
                key: 'actions',
                header: '',
                render: (o) =>
                  o.status === 'PENDING' ? (
                    <Can permission="reminders.complete">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        busy={busy}
                        onClick={() => {
                          void (async () => {
                            setBusy(true)
                            try {
                              await completeOccurrence(o.id)
                              await load()
                            } catch (err) {
                              setError(err instanceof ApiError ? err.message : 'Unable to complete occurrence')
                            } finally {
                              setBusy(false)
                            }
                          })()
                        }}
                      >
                        Complete
                      </Button>
                    </Can>
                  ) : null,
              },
            ]}
          />
        </Card>
      </div>

      <div className="mb-4">
        <Card
          title="Notification history"
          description="Daily summaries and WhatsApp delivery status for this reminder (Asia/Dubai)."
        >
          {(detail.notificationHistory?.length ?? 0) === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="Daily WhatsApp summaries and occurrence messages will appear here."
            />
          ) : (
            <Table
              rows={detail.notificationHistory.map((n) => ({ ...n, id: n.id }))}
              columns={[
                {
                  key: 'when',
                  header: 'When',
                  render: (n) => formatDubaiDateTime(n.sentAt ?? n.createdAt),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: (n) => (
                    <span>
                      {n.messageType === 'DAILY_SUMMARY'
                        ? 'Daily summary'
                        : n.messageType === 'MANUAL'
                          ? 'Test / manual'
                          : 'Occurrence'}
                      {n.isTest ? ' (test)' : ''}
                      {n.forDate ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{n.forDate}</span>
                      ) : null}
                    </span>
                  ),
                },
                {
                  key: 'recipient',
                  header: 'Recipient',
                  render: (n) => n.recipientName || n.recipientPhoneMasked || '—',
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (n) => (
                    <span
                      className={
                        n.status === 'FAILED'
                          ? 'text-rose-700'
                          : n.status === 'DELIVERED' || n.status === 'READ'
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                      }
                    >
                      {n.status === 'DELIVERED' || n.status === 'READ'
                        ? '✓ Delivered'
                        : n.status === 'FAILED'
                          ? '⚠ Failed'
                          : n.status}
                    </span>
                  ),
                },
                {
                  key: 'provider',
                  header: 'Provider ID',
                  render: (n) => (
                    <span className="font-mono text-xs text-slate-500">
                      {n.providerMessageId ? `${n.providerMessageId.slice(0, 16)}…` : '—'}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>

      <Card title="Audit history">
        {detail.auditTrail.length === 0 ? (
          <EmptyState title="No audit entries" description="Actions on this reminder will appear here." />
        ) : (
          <ul className="space-y-3">
            {detail.auditTrail.map((item) => (
              <li key={item.id} className="border-b border-slate-100 pb-3 text-sm last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{item.action}</span>
                  <span className="text-xs text-slate-500">{formatDubaiDateTime(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-slate-600">
                  {item.actorName}
                  {item.metadata && typeof item.metadata === 'object' && 'event' in item.metadata
                    ? ` · ${String((item.metadata as { event?: string }).event)}`
                    : ''}
                </p>
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
            ? 'This acknowledges the reminder as done and keeps the history.'
            : 'This cancels the reminder and future notifications. Historical occurrences are preserved.'
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
