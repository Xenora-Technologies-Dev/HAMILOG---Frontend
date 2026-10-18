import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { ApiError } from '@/services/apiClient'
import {
  getWhatsAppLog,
  type WhatsAppLog,
  type WhatsAppLogDirection,
  type WhatsAppLogItem,
  type WhatsAppTemplateDefinition,
} from '@/services/whatsappService'
import { formatDubaiDateTime } from '@/utils/date'

const FILTERS: Array<{ id: WhatsAppLogDirection; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'outbound', label: 'Sent' },
  { id: 'inbound', label: 'Received' },
]

function statusMark(status: string) {
  if (status === 'READ') return { label: '✓✓', className: 'text-sky-600' }
  if (status === 'DELIVERED') return { label: '✓✓', className: 'text-emerald-800/70' }
  if (status === 'SENT') return { label: '✓', className: 'text-emerald-800/70' }
  if (status === 'FAILED') return { label: 'Failed', className: 'text-rose-700' }
  if (status === 'QUEUED') return { label: 'Queued', className: 'text-slate-500' }
  if (status === 'RECEIVED') return { label: '', className: '' }
  return { label: status, className: 'text-slate-500' }
}

function bubbleTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function WhatsAppLogPage() {
  const [log, setLog] = useState<WhatsAppLog | null>(null)
  const [direction, setDirection] = useState<WhatsAppLogDirection>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async (next: WhatsAppLogDirection) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWhatsAppLog(next)
      setLog(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load the WhatsApp log')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(direction)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [direction, load])

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp log"
        description="The owner gets the day's reminders at 9:00 and the ones still open at 17:00. Staff reminders use the event template. Assigning an event to staff needs the extra template below."
        breadcrumb={<span>Home / WhatsApp log</span>}
        actions={
          <Button variant="secondary" onClick={() => void load(direction)} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading && !log ? <LoadingState label="Loading WhatsApp log…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load(direction)} /> : null}

      {log ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <PhonePreview log={log} direction={direction} onDirection={setDirection} />
          <div className="space-y-4">
            <WebhookCard log={log} copied={copied} onCopy={copyText} />
            <TemplateCard
              template={log.template}
              title="Template for Meta approval"
              description="Approve this Utility template with no header and no footer. Quick replies: Completed acknowledges the stored event. Remind tomorrow sends the same event again the next day at its send time."
              copyPrefix="event"
              copied={copied}
              onCopy={copyText}
            />
            {log.assignedTemplate ? (
              <TemplateCard
                template={log.assignedTemplate}
                title="Staff assignment template"
                description="Approve this Utility template before a staff member can be told on WhatsApp that an event was created for them. Their timed reminder still uses the template above."
                copyPrefix="assigned"
                copied={copied}
                onCopy={copyText}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PhonePreview({
  log,
  direction,
  onDirection,
}: {
  log: WhatsAppLog
  direction: WhatsAppLogDirection
  onDirection: (direction: WhatsAppLogDirection) => void
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#0b141a] shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-[#075e54] px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">HAMLOG</p>
          <p className="text-xs text-emerald-100">WhatsApp Business · Asia/Dubai</p>
        </div>
        <div className="flex rounded-full bg-black/15 p-0.5 text-xs">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onDirection(filter.id)}
              className={[
                'rounded-full px-2.5 py-1 font-medium',
                direction === filter.id ? 'bg-white text-[#075e54]' : 'text-emerald-50',
              ].join(' ')}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="max-h-[720px] space-y-3 overflow-y-auto bg-[#ece5dd] px-3 py-4"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20px 20px, rgba(255,255,255,0.35) 1px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
        aria-label="WhatsApp conversation"
      >
        {log.template.sequencePreviews.map((body, index) => (
          <TemplateBubble
            key={body}
            name={log.template.name}
            header={log.template.header}
            body={body}
            footer={log.template.footer}
            buttons={log.template.buttons}
            caption={
              index === 0
                ? '1st message · 7 days before at 09:00'
                : `${index + 1}${index === 1 ? 'nd' : 'th'} message · same day and time`
            }
          />
        ))}

        <WebhookBubble webhook={log.webhook} />

        {log.messages.length === 0 ? (
          <p className="mx-auto max-w-xs rounded-lg bg-white/80 px-3 py-2 text-center text-xs leading-5 text-slate-600">
            No send or receive events yet. Outbound reminders appear after a send. Inbound replies appear when Meta posts them to the webhook.
          </p>
        ) : (
          log.messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>
    </section>
  )
}

function TemplateBubble({
  name,
  header,
  body,
  footer,
  buttons = [],
  caption,
}: {
  name: string
  header: string
  body: string
  footer: string
  buttons?: string[]
  caption: string
}) {
  return (
    <div className="ml-auto max-w-[92%]">
      <div className="overflow-hidden rounded-lg rounded-tr-sm bg-[#d9fdd3] text-[13px] leading-5 text-slate-900 shadow-sm">
        <div className="bg-[#d1f4cc] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#075e54] uppercase">
          {name}
        </div>
        <div className="px-3 pt-2 pb-1.5">
          {header ? <p className="font-semibold">{header}</p> : null}
          <p className={`whitespace-pre-wrap ${header ? 'mt-1' : ''}`}>{body}</p>
          {footer ? <p className="mt-2 text-[11px] text-slate-500">{footer}</p> : null}
        </div>
        {buttons.map((label) => (
          <div
            key={label}
            className="border-t border-black/10 px-3 py-2 text-center text-[13px] font-medium text-[#027eb5]"
          >
            {label}
          </div>
        ))}
      </div>
      <p className="mt-1 text-right text-[10px] text-slate-500">{caption}</p>
    </div>
  )
}

function WebhookBubble({ webhook }: { webhook: WhatsAppLog['webhook'] }) {
  return (
    <div className="mr-auto max-w-[92%]">
      <div className="overflow-hidden rounded-lg rounded-tl-sm bg-white text-[13px] leading-5 text-slate-900 shadow-sm">
        <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
          Webhook · {webhook.subscribeField}
        </div>
        <div className="space-y-2 px-3 py-2">
          <div>
            <p className="text-[11px] font-medium text-slate-500">Callback URL</p>
            <p className="break-all font-medium">{webhook.callbackUrl}</p>
          </div>
          <p>
            {webhook.verifyMethod} verifies the portal challenge. {webhook.receiveMethod} receives sent-status updates and inbound messages.
          </p>
          <p className="text-[12px] text-slate-600">
            Verify token: {webhook.verifyTokenConfigured ? 'configured' : 'missing'} ({webhook.verifyTokenEnv})
          </p>
          {webhook.lastEventAt ? (
            <p className="text-[11px] text-slate-500">
              Last webhook {webhook.lastEventStatus} · {formatDubaiDateTime(webhook.lastEventAt)}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">No webhook calls recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: WhatsAppLogItem }) {
  const outbound = message.direction === 'outbound'
  const mark = statusMark(message.status)
  const who = message.contactName || message.phone
  return (
    <div className={outbound ? 'ml-auto max-w-[92%]' : 'mr-auto max-w-[92%]'}>
      <div
        className={[
          'overflow-hidden rounded-lg text-[13px] leading-5 text-slate-900 shadow-sm',
          outbound ? 'rounded-tr-sm bg-[#d9fdd3]' : 'rounded-tl-sm bg-white',
        ].join(' ')}
      >
        {message.header ? (
          <div className="px-3 pt-2 font-semibold">{message.header}</div>
        ) : (
          <div className="px-3 pt-2 text-[11px] font-medium text-slate-500">{who}</div>
        )}
        <div className="px-3 pt-1 pb-1.5">
          <p className="whitespace-pre-wrap">{message.body}</p>
          {message.footer ? <p className="mt-2 text-[11px] text-slate-500">{message.footer}</p> : null}
          {message.failureReason ? (
            <p className="mt-1 text-[11px] text-rose-700">{message.failureReason}</p>
          ) : null}
          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
            <span title={formatDubaiDateTime(message.at)}>{bubbleTime(message.at)}</span>
            {mark.label ? <span className={mark.className}>{mark.label}</span> : null}
          </p>
        </div>
      </div>
    </div>
  )
}

function WebhookCard({
  log,
  copied,
  onCopy,
}: {
  log: WhatsAppLog
  copied: string | null
  onCopy: (key: string, value: string) => void
}) {
  const { webhook } = log
  return (
    <Card
      title="Meta developer portal"
      description="Paste this callback into WhatsApp > Configuration. Subscribe to the messages field so both delivery statuses and inbound replies are delivered."
      actions={
        <Button size="sm" variant="secondary" onClick={() => onCopy('url', webhook.callbackUrl)}>
          {copied === 'url' ? 'Copied' : 'Copy URL'}
        </Button>
      }
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Callback URL</dt>
          <dd className="mt-1 break-all rounded-xl bg-slate-50 px-3 py-2 font-medium text-slate-900">
            {webhook.callbackUrl}
          </dd>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Verify token</dt>
            <dd className="mt-1">
              <Badge tone={webhook.verifyTokenConfigured ? 'success' : 'warning'}>
                {webhook.verifyTokenConfigured ? 'Configured' : 'Not set'}
              </Badge>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use the server value of {webhook.verifyTokenEnv}. It stays out of this page.
              </p>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Webhook field</dt>
            <dd className="mt-1 font-medium text-slate-900">{webhook.subscribeField}</dd>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {webhook.verifyMethod} answers the hub challenge. {webhook.receiveMethod} stores sent, delivered, read, failed, and received messages.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={webhook.signatureConfigured ? 'success' : 'neutral'}>
            {webhook.signatureConfigured ? 'Signature check on' : 'Signature check off'}
          </Badge>
          <Badge tone={webhook.reachable ? 'success' : 'warning'}>
            {webhook.reachable ? 'Public HTTPS URL' : 'Local URL — Meta cannot call this'}
          </Badge>
          <Badge tone="info">{log.counts.outbound} sent</Badge>
          <Badge tone="info">{log.counts.inbound} received</Badge>
          <Badge tone={log.counts.failed > 0 ? 'danger' : 'neutral'}>{log.counts.failed} failed</Badge>
        </div>
      </dl>
    </Card>
  )
}

function TemplateCard({
  template,
  title,
  description,
  copyPrefix,
  copied,
  onCopy,
}: {
  template: WhatsAppTemplateDefinition
  title: string
  description: string
  copyPrefix: string
  copied: string | null
  onCopy: (key: string, value: string) => void
}) {
  const nameKey = `${copyPrefix}-name`
  const bodyKey = `${copyPrefix}-body`
  const allKey = `${copyPrefix}-all`
  return (
    <Card
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onCopy(nameKey, template.name)}>
            {copied === nameKey ? 'Copied' : 'Copy name'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onCopy(bodyKey, template.body)}>
            {copied === bodyKey ? 'Copied' : 'Copy body'}
          </Button>
          <Button size="sm" onClick={() => onCopy(allKey, template.submissionText)}>
            {copied === allKey ? 'Copied' : 'Copy full template'}
          </Button>
        </div>
      }
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd className="mt-1 font-semibold text-slate-900">{template.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Category</dt>
          <dd className="mt-1 font-medium text-slate-900">{template.category}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Language</dt>
          <dd className="mt-1 font-medium text-slate-900">{template.language}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3 text-sm">
        <CopyBlock label="Header" value={template.header || 'None'} />
        <CopyBlock label="Body" value={template.body} pre />
        <CopyBlock label="Footer" value={template.footer || 'None'} />
        {template.buttons.length > 0 ? (
          <CopyBlock label="Quick replies" value={template.buttons.join(' · ')} />
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
              <th className="py-2 pr-3 font-medium">Variable</th>
              <th className="py-2 pr-3 font-medium">Sample</th>
              <th className="py-2 font-medium">Stored event field</th>
            </tr>
          </thead>
          <tbody>
            {template.variables.map((variable) => (
              <tr key={variable.index} className="border-b border-slate-50">
                <td className="py-2 pr-3 font-medium text-slate-900">
                  {`{{${variable.index}}}`} {variable.name}
                </td>
                <td className="py-2 pr-3 text-slate-700">{variable.sample}</td>
                <td className="py-2 text-slate-600">{variable.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function CopyBlock({ label, value, pre = false }: { label: string; value: string; pre?: boolean }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p
        className={[
          'mt-1 rounded-xl bg-slate-50 px-3 py-2 text-slate-900',
          pre ? 'whitespace-pre-wrap' : 'font-medium',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
