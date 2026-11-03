import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fieldControlClass, fieldHintClass, fieldLabelClass } from '@/components/ui/fieldStyles'
import { ApiError } from '@/services/apiClient'
import {
  getTestSendOptions,
  getTestSendStatus,
  sendTestMessage,
  type SenderThrottleInfo,
  type TestSendDebug,
  type TestSendEventOption,
  type TestSendRecipientOption,
  type TestSendResult,
  type TestSendStatus,
} from '@/services/whatsappService'

const RATE_GUARD_MS = 5_000

function dubaiDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

function throttleLine(throttle: SenderThrottleInfo | null) {
  if (!throttle) return 'Sender throttle: loading…'
  const strikes =
    throttle.effectiveStrikes === throttle.strikes
      ? `${throttle.strikes}`
      : `${throttle.effectiveStrikes} (stored ${throttle.strikes}, decaying)`
  const cooldown = throttle.cooldownUntil
    ? `cooldown until ${dubaiDateTime(throttle.cooldownUntil)} Dubai`
    : 'no cooldown'
  const last = throttle.lastCode ? ` · last error ${throttle.lastCode}` : ''
  return `Sender throttle: strikes ${strikes} · ${cooldown}${last}`
}

type SendError = {
  status: number | null
  code: string
  message: string
  debug: TestSendDebug | null
  timestamp: string
}

function errorText(error: SendError) {
  if (error.debug) {
    const d = error.debug
    return JSON.stringify(
      {
        timestamp: d.timestamp,
        httpStatus: d.httpStatus,
        metaCode: d.code,
        metaSubcode: d.subcode,
        type: d.type,
        title: d.title,
        message: d.message,
        'error_data.details': d.details,
        fbtrace_id: d.fbtraceId,
        template: { name: d.templateName, language: d.languageCode },
        recipient: d.recipientLabel,
        endpoint: d.endpoint,
        requestPayload: d.requestPayload,
      },
      null,
      2,
    )
  }
  return JSON.stringify(
    {
      timestamp: error.timestamp,
      httpStatus: error.status,
      code: error.code,
      message: error.message,
    },
    null,
    2,
  )
}

export function SendTestMessageModal({
  open,
  onClose,
  onSent,
}: {
  open: boolean
  onClose: () => void
  onSent?: () => void
}) {
  const [recipients, setRecipients] = useState<TestSendRecipientOption[]>([])
  const [events, setEvents] = useState<TestSendEventOption[]>([])
  const [throttle, setThrottle] = useState<SenderThrottleInfo | null>(null)
  const [template, setTemplate] = useState<{ name: string; language: string } | null>(null)
  const [recipientId, setRecipientId] = useState('')
  const [search, setSearch] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<TestSendEventOption | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [lastSendAt, setLastSendAt] = useState(0)
  const [nowTick, setNowTick] = useState(0)
  const [result, setResult] = useState<TestSendResult | null>(null)
  const [delivery, setDelivery] = useState<TestSendStatus | null>(null)
  const [error, setError] = useState<SendError | null>(null)
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<number | null>(null)

  const loadOptions = useCallback(async (query: string, first: boolean) => {
    setLoadingOptions(true)
    setOptionsError(null)
    try {
      const res = await getTestSendOptions(query)
      setEvents(res.data.events)
      setThrottle(res.data.throttle)
      setTemplate({ name: res.data.templateName, language: res.data.languageCode })
      if (first) {
        setRecipients(res.data.recipients)
        setRecipientId((current) => current || res.data.recipients[0]?.id || '')
      }
    } catch (err) {
      setOptionsError(
        err instanceof ApiError ? err.message : 'Unable to load recipients and events',
      )
    } finally {
      setLoadingOptions(false)
    }
  }, [])

  // First load when the dialog opens.
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => void loadOptions('', true), 0)
    return () => window.clearTimeout(timer)
  }, [open, loadOptions])

  // Debounced event search.
  const firstSearch = useRef(true)
  useEffect(() => {
    if (!open) return
    if (firstSearch.current) {
      firstSearch.current = false
      return
    }
    const timer = window.setTimeout(() => void loadOptions(search, false), 300)
    return () => window.clearTimeout(timer)
  }, [open, search, loadOptions])

  // Countdown for the 5 s guard.
  useEffect(() => {
    if (!open || !lastSendAt) return
    const timer = window.setInterval(() => setNowTick(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [open, lastSendAt])

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])
  useEffect(() => stopPolling, [stopPolling])

  const close = useCallback(() => {
    stopPolling()
    setResult(null)
    setDelivery(null)
    setError(null)
    setCopied(false)
    firstSearch.current = true
    onClose()
  }, [onClose, stopPolling])

  // Meta reports throttling (130429) a few seconds after accepting the message,
  // so follow the delivery status for up to 40 s.
  const followDelivery = useCallback(
    (messageId: string) => {
      stopPolling()
      let rounds = 0
      pollRef.current = window.setInterval(async () => {
        rounds += 1
        try {
          const res = await getTestSendStatus(messageId)
          setDelivery(res.data)
          if (['DELIVERED', 'READ', 'FAILED'].includes(res.data.status) || rounds >= 13) {
            stopPolling()
            onSent?.()
          }
        } catch {
          if (rounds >= 13) stopPolling()
        }
      }, 3_000)
    },
    [onSent, stopPolling],
  )

  const waitLeftMs = lastSendAt ? Math.max(0, RATE_GUARD_MS - (nowTick - lastSendAt)) : 0
  const canSend = Boolean(recipientId && selectedEvent) && !sending && waitLeftMs === 0

  const send = async () => {
    if (!selectedEvent || !recipientId) return
    setSending(true)
    setResult(null)
    setDelivery(null)
    setError(null)
    setCopied(false)
    stopPolling()
    setLastSendAt(Date.now())
    setNowTick(Date.now())
    try {
      const res = await sendTestMessage({ recipientId, reminderId: selectedEvent.id })
      setResult(res.data)
      followDelivery(res.data.messageId)
      onSent?.()
    } catch (err) {
      const details =
        err instanceof ApiError ? (err.details as { debug?: TestSendDebug } | undefined) : undefined
      setError({
        status: err instanceof ApiError ? err.status : null,
        code: err instanceof ApiError ? err.code : 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Send failed',
        debug: details?.debug ?? null,
        timestamp: new Date().toISOString(),
      })
      onSent?.()
    } finally {
      setSending(false)
      void loadOptions(search, false)
    }
  }

  const copyError = async () => {
    if (!error) return
    const text = errorText(error)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Send test message"
      onClose={close}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
          <Button onClick={() => void send()} disabled={!canSend} busy={sending}>
            {waitLeftMs > 0 ? `Send (${Math.ceil(waitLeftMs / 1000)}s)` : 'Send'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs leading-5 text-slate-500">
          Sends the <span className="font-mono">{template?.name ?? 'reminder_occurrence'}</span>{' '}
          template
          {template ? ` (${template.language})` : ''} with the same values as the automated
          reminder, straight to Meta. It skips the queue and pacing, does not count toward automated
          reminders and is marked as a test in the log.
        </p>

        {optionsError ? <p className="text-sm text-rose-700">{optionsError}</p> : null}

        <label className="block">
          <span className={fieldLabelClass}>Recipient</span>
          <select
            className={fieldControlClass()}
            value={recipientId}
            onChange={(event) => setRecipientId(event.target.value)}
            disabled={recipients.length === 0}
          >
            {recipients.length === 0 ? (
              <option value="">{loadingOptions ? 'Loading…' : 'No recipients'}</option>
            ) : null}
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.kind === 'owner'
                  ? 'Owner: '
                  : recipient.kind === 'owner-backup'
                    ? 'Owner backup: '
                    : ''}
                {recipient.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className={fieldLabelClass}>Event</span>
          <input
            className={fieldControlClass()}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events by title"
            aria-label="Search events by title"
          />
          <div
            className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200"
            role="listbox"
            aria-label="Events"
          >
            {events.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-500">
                {loadingOptions ? 'Loading…' : 'No events match.'}
              </p>
            ) : null}
            {events.map((item) => {
              const active = selectedEvent?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setSelectedEvent(item)}
                  className={[
                    'flex w-full flex-col items-start border-b border-slate-100 px-3 py-2 text-left last:border-b-0',
                    active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className={active ? 'text-xs text-slate-200' : 'text-xs text-slate-500'}>
                    {item.eventDate} · {item.category}
                    {item.status !== 'ACTIVE' ? ` · ${item.status.toLowerCase()}` : ''}
                  </span>
                </button>
              )
            })}
          </div>
          {selectedEvent ? (
            <span className={fieldHintClass}>
              Selected: {selectedEvent.title} ({selectedEvent.eventDate} · {selectedEvent.category})
            </span>
          ) : null}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          <p className="font-medium">{throttleLine(throttle)}</p>
          <p>
            Sending while Meta is rate limiting this number may extend Meta&apos;s throttle. The
            test send is not blocked by the cooldown.
          </p>
        </div>

        {result ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            <p className="font-medium">Message sent</p>
            <p className="break-all font-mono text-[11px] text-emerald-800">{result.wamid}</p>
            <p className="mt-1 text-xs">
              {delivery?.status === 'DELIVERED' || delivery?.status === 'READ'
                ? `Delivered${delivery.status === 'READ' ? ' and read' : ''}.`
                : delivery?.status === 'FAILED'
                  ? `Meta accepted it, then reported: ${delivery.failureReason ?? 'failed'}${
                      delivery.webhookError && 'code' in delivery.webhookError
                        ? ` (code ${String(delivery.webhookError.code)})`
                        : ''
                    }`
                  : 'Accepted by Meta. Waiting for the delivery status…'}
            </p>
          </div>
        ) : null}

        {error ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
            role="alert"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Send failed: {error.message}</p>
              <Button size="sm" variant="secondary" onClick={() => void copyError()}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-white p-2 font-mono text-[11px] leading-4 whitespace-pre-wrap text-slate-800 select-all">
              {errorText(error)}
            </pre>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
