import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { ReminderCategory, ReminderPayload, Reminder } from '@/services/reminderService'
import type { StaffMember } from '@/services/staffService'
import { formatDubaiTime } from '@/utils/date'
import {
  RECURRENCE_OPTIONS,
  REMIND_PRESETS,
  nearestRemindKey,
  parseRemindKey,
  remindLabel,
} from '@/features/reminders/reminderFormUtils'

type Props = {
  categories: ReminderCategory[]
  staff: StaffMember[]
  initial?: Reminder | null
  busy?: boolean
  error?: string | null
  submitLabel: string
  onSubmit: (payload: ReminderPayload) => Promise<void>
  onCancel: () => void
}

export function ReminderForm({
  categories,
  staff,
  initial,
  busy,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const assignableStaff = useMemo(() => staff.filter((member) => member.isAssignable), [staff])
  const [title, setTitle] = useState(initial?.title ?? '')
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? '')
  const [eventTime, setEventTime] = useState(
    formatDubaiTime(initial?.eventTime) || initial?.rules[0]?.sendTimeLocal || '09:00',
  )
  const [recurrenceType, setRecurrenceType] = useState<Reminder['recurrenceType']>(
    initial?.recurrenceType ?? 'NONE',
  )
  const [staffId, setStaffId] = useState(
    initial?.ownerUser?.id ?? initial?.recipients.find((recipient) => recipient.user)?.user?.id ?? '',
  )
  const initialRemindKey = nearestRemindKey(initial?.rules ?? [])
  const [remindKey, setRemindKey] = useState(initialRemindKey)
  const [localError, setLocalError] = useState<string | null>(null)

  const remindOptions = useMemo(() => {
    const options = REMIND_PRESETS.map((preset) => ({ value: preset.key, label: preset.label }))
    if (!options.some((option) => option.value === remindKey)) {
      const parsed = parseRemindKey(remindKey)
      options.push({ value: remindKey, label: remindLabel(parsed.offsetValue, parsed.offsetUnit) })
    }
    return options
  }, [remindKey])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    const categoryId = initial?.category.id ?? categories[0]?.id
    if (!title.trim() || !eventDate || !eventTime || !categoryId) {
      setLocalError('Event name, date, and time are required')
      return
    }
    const remind = parseRemindKey(remindKey)
    const time = eventTime.slice(0, 5)
    const payload: ReminderPayload = {
      title: title.trim(),
      categoryId,
      eventDate,
      eventTimeLocal: time,
      recurrenceType,
      recurrenceInterval: 1,
      recurrenceUntil: null,
      ownerUserId: staffId || null,
      recipientUserIds: staffId ? [staffId] : [],
      rules: [
        {
          offsetValue: remind.offsetValue,
          offsetUnit: remind.offsetUnit,
          sendTimeLocal: time,
          isActive: true,
        },
      ],
    }
    await onSubmit(payload)
  }

  return (
    <form className="mx-auto max-w-xl space-y-5" onSubmit={(e) => void handleSubmit(e)}>
      {(error || localError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error || localError}
        </div>
      )}

      <Input
        label="Event name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Visa renewal"
        required
        autoFocus
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
        />
        <Input
          label="Time"
          type="time"
          value={eventTime}
          onChange={(e) => setEventTime(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Recurrence"
          value={recurrenceType}
          onChange={(e) => setRecurrenceType(e.target.value as Reminder['recurrenceType'])}
          options={RECURRENCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        />
        <Select
          label="Remind me"
          value={remindKey}
          onChange={(e) => setRemindKey(e.target.value)}
          options={remindOptions}
        />
      </div>

      <Select
        label="Staff"
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
        options={[
          { value: '', label: 'No staff' },
          ...assignableStaff.map((member) => ({ value: member.id, label: member.name })),
        ]}
      />

      <p className="text-sm text-slate-500">
        The reminder is sent at the event time, on the day selected in Remind me. Times are Dubai time.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} busy={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
