import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { ApiError } from '@/services/apiClient'
import { getWhatsAppLog, type WhatsAppLogItem } from '@/services/whatsappService'
import { dubaiToday } from '@/utils/date'

type Chat = {
  key: string
  title: string
  phone: string
  saved: boolean
  messages: WhatsAppLogItem[]
  last: WhatsAppLogItem
}

const AVATAR_COLORS = ['#00a884', '#53bdeb', '#7f66ff', '#e67e22', '#06cf9c', '#df4e8a', '#54656f']

function dubaiDay(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function shiftDay(day: string, delta: number) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, date! + delta)).toISOString().slice(0, 10)
}

function clock(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function listTime(iso: string) {
  const day = dubaiDay(iso)
  if (day === dubaiToday()) return clock(iso)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(iso))
}

function dayLabel(iso: string) {
  const day = dubaiDay(iso)
  const today = dubaiToday()
  if (day === today) return 'Today'
  if (day === shiftDay(today, -1)) return 'Yesterday'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

function preview(body: string) {
  return body.replace(/\s+/g, ' ').trim()
}

function avatarColor(key: string) {
  let hash = 0
  for (const char of key) hash = (hash + char.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0]
}

function initials(title: string) {
  if (title.startsWith('+') || /^\d/.test(title)) return title.replace(/\D/g, '').slice(-2) || '#'
  const parts = title.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

function buildChats(messages: WhatsAppLogItem[]): Chat[] {
  const groups = new Map<string, WhatsAppLogItem[]>()
  for (const message of messages) {
    const key = message.phoneKey || message.phone
    const rows = groups.get(key) ?? []
    rows.push(message)
    groups.set(key, rows)
  }
  return [...groups.entries()]
    .map(([key, rows]) => {
      const ordered = [...rows].sort((a, b) => a.at.localeCompare(b.at))
      const last = ordered[ordered.length - 1]!
      const savedName = [...ordered].reverse().find((row) => row.contactName)?.contactName ?? null
      return {
        key,
        title: savedName || last.phone,
        phone: last.phone,
        saved: Boolean(savedName),
        messages: ordered,
        last,
      }
    })
    .sort((a, b) => b.last.at.localeCompare(a.last.at))
}

export function WhatsAppLogPage() {
  const [messages, setMessages] = useState<WhatsAppLogItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWhatsAppLog('all')
      setMessages(res.data.messages)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load WhatsApp messages')
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

  const chats = useMemo(() => buildChats(messages ?? []), [messages])
  const visibleChats = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return chats
    return chats.filter(
      (chat) => chat.title.toLowerCase().includes(needle) || chat.phone.toLowerCase().includes(needle),
    )
  }, [chats, query])

  useEffect(() => {
    if (selectedKey && !chats.some((chat) => chat.key === selectedKey)) setSelectedKey(null)
  }, [chats, selectedKey])

  const selected = chats.find((chat) => chat.key === selectedKey) ?? null

  return (
    <div className="flex h-[calc(100dvh-6.75rem)] min-h-[520px] overflow-hidden rounded-xl border border-[#d1d7db] bg-white shadow-sm">
      <aside
        className={[
          'min-h-0 w-full flex-col border-[#e9edef] bg-white md:flex md:w-[380px] md:shrink-0 md:border-r',
          selected ? 'hidden' : 'flex',
        ].join(' ')}
      >
        <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3">
          <h1 className="text-[22px] font-normal text-[#111b21]">Chats</h1>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full p-2 text-[#54656f] hover:bg-black/5 disabled:opacity-50"
            aria-label="Refresh chats"
          >
            <RefreshIcon />
          </button>
        </div>
        <div className="px-3 py-2">
          <label className="flex items-center gap-3 rounded-lg bg-[#f0f2f5] px-3 py-1.5 text-[#54656f]">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent py-1 text-[15px] text-[#111b21] outline-none placeholder:text-[#667781]"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-label="Chats">
          {loading && !messages ? <LoadingState label="Loading chats…" /> : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!loading && !error && visibleChats.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[#667781]">
              {chats.length === 0 ? 'No messages yet.' : 'No chats match that search.'}
            </p>
          ) : null}
          {visibleChats.map((chat) => (
            <button
              key={chat.key}
              type="button"
              role="option"
              aria-selected={chat.key === selectedKey}
              onClick={() => setSelectedKey(chat.key)}
              className={[
                'flex w-full items-center gap-3 border-b border-[#e9edef] px-3 py-3 text-left hover:bg-[#f5f6f6]',
                chat.key === selectedKey ? 'bg-[#f0f2f5]' : 'bg-white',
              ].join(' ')}
            >
              <Avatar name={chat.title} colorKey={chat.key} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[17px] text-[#111b21]">{chat.title}</span>
                  <span className="shrink-0 text-xs text-[#667781]">{listTime(chat.last.at)}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[14px] text-[#667781]">
                  {chat.last.direction === 'outbound' ? <StatusIcon status={chat.last.status} compact /> : null}
                  <span className="truncate">{preview(chat.last.body)}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section
        className={[
          'min-h-0 min-w-0 flex-1 flex-col bg-[#efeae2]',
          selected ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {selected ? (
          <Conversation chat={selected} onBack={() => setSelectedKey(null)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center border-b-[6px] border-[#25d366] px-6 text-center">
            <p className="text-3xl font-light text-[#41525d]">WhatsApp</p>
            <p className="mt-2 max-w-sm text-sm text-[#667781]">Select a chat to read the messages.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function Conversation({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chat.key, chat.messages.length])

  let previousDay = ''

  return (
    <>
      <header className="flex items-center gap-3 bg-[#f0f2f5] px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 text-[#54656f] hover:bg-black/5 md:hidden"
          aria-label="Back to chats"
        >
          <BackIcon />
        </button>
        <Avatar name={chat.title} colorKey={chat.key} />
        <div className="min-w-0">
          <p className="truncate text-[16px] text-[#111b21]">{chat.title}</p>
          {chat.saved ? <p className="truncate text-[13px] text-[#667781]">{chat.phone}</p> : null}
        </div>
      </header>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-12"
        style={{
          backgroundColor: '#efeae2',
          backgroundImage:
            'radial-gradient(circle at 12px 16px, rgba(11,20,26,0.035) 1px, transparent 1.4px), radial-gradient(circle at 28px 36px, rgba(11,20,26,0.03) 1px, transparent 1.4px)',
          backgroundSize: '48px 48px',
        }}
        aria-label={`Messages with ${chat.title}`}
      >
        {chat.messages.map((message) => {
          const day = dubaiDay(message.at)
          const showDay = day !== previousDay
          previousDay = day
          const outbound = message.direction === 'outbound'
          return (
            <div key={message.id}>
              {showDay ? (
                <div className="my-3 flex justify-center">
                  <span className="rounded-lg bg-white px-3 py-1 text-xs text-[#54656f] shadow-sm">{dayLabel(message.at)}</span>
                </div>
              ) : null}
              <div className={outbound ? 'mb-1.5 flex justify-end' : 'mb-1.5 flex justify-start'}>
                <div
                  className={[
                    'relative max-w-[85%] rounded-lg px-2 pt-1.5 pb-1 text-[14.2px] leading-5 text-[#111b21] shadow-sm sm:max-w-[65%]',
                    outbound ? 'bg-[#d9fdd3]' : 'bg-white',
                  ].join(' ')}
                >
                  {message.header ? <p className="px-1 font-semibold">{message.header}</p> : null}
                  <p className="px-1 whitespace-pre-wrap">{message.body}</p>
                  {message.footer ? <p className="px-1 text-[12px] text-[#667781]">{message.footer}</p> : null}
                  <p className="flex items-center justify-end gap-1 px-1 pt-0.5 text-[11px] leading-none text-[#667781]">
                    <span>{clock(message.at)}</span>
                    {outbound ? <StatusIcon status={message.status} /> : null}
                  </p>
                  {outbound && message.status === 'FAILED' ? (
                    <p className="px-1 text-[12px] text-[#ea0038]">{message.failureReason || 'Not delivered'}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
    </>
  )
}

function Avatar({ name, colorKey }: { name: string; colorKey: string }) {
  return (
    <span
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
      style={{ backgroundColor: avatarColor(colorKey) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

function StatusIcon({ status, compact = false }: { status: string; compact?: boolean }) {
  const size = compact ? 14 : 16
  if (status === 'READ') return <DoubleTick size={size} className="text-[#53bdeb]" label="Read" />
  if (status === 'DELIVERED') return <DoubleTick size={size} className="text-[#8696a0]" label="Delivered" />
  if (status === 'SENT') return <SingleTick size={size} className="text-[#8696a0]" label="Sent" />
  if (status === 'QUEUED') return <ClockIcon size={size} label="Pending" />
  if (status === 'FAILED') return <FailedIcon label="Failed" />
  if (status === 'CANCELLED') return <span className="text-[10px] text-[#8696a0]">Cancelled</span>
  return null
}

function SingleTick({ size, className, label }: { size: number; className: string; label: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-label={label} role="img">
      <path
        d="M3.2 8.3 6.1 11.2 12.8 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DoubleTick({ size, className, label }: { size: number; className: string; label: string }) {
  return (
    <svg width={size + 4} height={size} viewBox="0 0 20 16" className={className} aria-label={label} role="img">
      <path
        d="M1.6 8.4 4.4 11.2 10.6 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 8.4 9 11.2 15.6 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ClockIcon({ size, label }: { size: number; label: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="text-[#8696a0]" aria-label={label} role="img">
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.2V8l1.8 1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function FailedIcon({ label }: { label: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="text-[#ea0038]" aria-label={label} role="img">
      <circle cx="8" cy="8" r="6.2" fill="currentColor" />
      <path d="M8 4.4v4.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.8" fill="white" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12a7 7 0 1 1-1.8-4.7M19 5v4h-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
