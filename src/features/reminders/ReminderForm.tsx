import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox, ChoiceChip } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { ReminderCategory, ReminderPayload, Reminder } from '@/services/reminderService'
import type { StaffMember } from '@/services/staffService'
import type { WhatsAppStatus } from '@/services/whatsappService'
import { addDaysToDateOnlyPreview } from '@/features/reminders/reminderFormUtils'

const PRESET_OFFSETS = [30, 15, 7, 1, 0]

type Props = {
  categories: ReminderCategory[]
  staff: StaffMember[]
  initial?: Reminder | null
  busy?: boolean
  error?: string | null
  submitLabel: string
  onSubmit: (payload: ReminderPayload) => Promise<void>
  onCancel: () => void
  whatsappStatus?: WhatsAppStatus | null
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
  whatsappStatus,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(initial?.category.id ?? categories[0]?.id ?? '')
  const effectiveCategoryId = categoryId || categories[0]?.id || ''
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? '')
  const [priority, setPriority] = useState<Reminder['priority']>(initial?.priority ?? 'MEDIUM')
  const [recurrenceType, setRecurrenceType] = useState<Reminder['recurrenceType']>(
    initial?.recurrenceType ?? 'NONE',
  )
  const [recurrenceInterval, setRecurrenceInterval] = useState(initial?.recurrenceInterval ?? 1)
  const [recurrenceUntil, setRecurrenceUntil] = useState(initial?.recurrenceUntil ?? '')
  const [personName, setPersonName] = useState(initial?.personName ?? '')
  const [referenceCode, setReferenceCode] = useState(initial?.referenceCode ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [ownerUserId, setOwnerUserId] = useState(initial?.ownerUser?.id ?? '')
  const [recipientUserIds, setRecipientUserIds] = useState<string[]>(
    (initial?.recipients.map((r) => r.user?.id).filter(Boolean) as string[]) ?? [],
  )
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>(
    initial?.rules.map((r) => r.offsetValue) ?? [30, 15, 7, 1, 0],
  )
  const [customOffset, setCustomOffset] = useState('')
  const [sendTimeLocal, setSendTimeLocal] = useState(initial?.rules[0]?.sendTimeLocal ?? '09:00')
  const [sendNow, setSendNow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const assignableStaff = useMemo(() => staff.filter((s) => s.isAssignable), [staff])

  const previewDates = useMemo(() => {
    if (!eventDate || selectedOffsets.length === 0) return []
    return [...selectedOffsets]
      .sort((a, b) => b - a)
      .map((offset) => ({
        offset,
        date: addDaysToDateOnlyPreview(eventDate, -offset),
      }))
  }, [eventDate, selectedOffsets])

  function toggleOffset(offset: number) {
    setSelectedOffsets((prev) => {
      const removing = prev.includes(offset)
      if (offset === 0 && removing) setSendNow(false)
      return removing ? prev.filter((v) => v !== offset) : [...prev, offset]
    })
  }

  function toggleSendNow() {
    setSendNow((prev) => {
      const next = !prev
      if (next) {
        setSelectedOffsets((offsets) => (offsets.includes(0) ? offsets : [...offsets, 0]))
      }
      return next
    })
  }

  function addCustomOffset() {
    const value = Number(customOffset)
    if (!Number.isInteger(value) || value < 0 || value > 3650) {
      setLocalError('Custom offset must be an integer between 0 and 3650')
      return
    }
    setLocalError(null)
    setSelectedOffsets((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setCustomOffset('')
  }

  function toggleRecipient(userId: string) {
    setRecipientUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (!title.trim() || !effectiveCategoryId || !eventDate || selectedOffsets.length === 0) {
      setLocalError('Title, category, event date, and at least one rule are required')
      return
    }
    const payload: ReminderPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId: effectiveCategoryId,
      eventDate,
      priority,
      recurrenceType,
      recurrenceInterval,
      recurrenceUntil: recurrenceUntil || null,
      personName: personName.trim() || null,
      referenceCode: referenceCode.trim() || null,
      notes: notes.trim() || null,
      ownerUserId: ownerUserId || null,
      recipientUserIds,
      rules: selectedOffsets.map((offsetValue) => ({
        offsetValue,
        offsetUnit: 'DAYS',
        sendTimeLocal,
        isActive: true,
      })),
      sendNow: !initial && sendNow,
    }
    await onSubmit(payload)
  }

  const extraOffsets = selectedOffsets.filter((offset) => !PRESET_OFFSETS.includes(offset))

  return (
    <form className="space-y-6" onSubmit={(e) => void handleSubmit(e)}>
      {(error || localError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error || localError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Select
          label="Category"
          value={effectiveCategoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Input
          label="Event date (Dubai)"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Reminder['priority'])}
          options={[
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
          ]}
        />
        <Input label="Person / subject" value={personName} onChange={(e) => setPersonName(e.target.value)} />
        <Input label="Reference" value={referenceCode} onChange={(e) => setReferenceCode(e.target.value)} />
      </div>

      <Textarea
        label="Description"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Select
          label="Recurrence"
          value={recurrenceType}
          onChange={(e) => setRecurrenceType(e.target.value as Reminder['recurrenceType'])}
          options={[
            { value: 'NONE', label: 'None' },
            { value: 'DAILY', label: 'Daily' },
            { value: 'WEEKLY', label: 'Weekly' },
            { value: 'MONTHLY', label: 'Monthly' },
            { value: 'YEARLY', label: 'Yearly' },
          ]}
        />
        <Input
          label="Interval"
          type="number"
          min={1}
          value={recurrenceInterval}
          onChange={(e) => setRecurrenceInterval(Number(e.target.value) || 1)}
        />
        <Input
          label="Recurrence until"
          type="date"
          value={recurrenceUntil}
          onChange={(e) => setRecurrenceUntil(e.target.value)}
          disabled={recurrenceType === 'NONE'}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Reminder rules (days before event)</p>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_OFFSETS.map((offset) => (
            <ChoiceChip
              key={offset}
              label={offset === 0 ? 'Same day' : `${offset} days before`}
              selected={selectedOffsets.includes(offset)}
              onToggle={() => toggleOffset(offset)}
            />
          ))}
          {!initial ? (
            <ChoiceChip
              label="Send now"
              selected={sendNow}
              accent
              onToggle={toggleSendNow}
            />
          ) : null}
          {extraOffsets.map((offset) => (
            <ChoiceChip
              key={offset}
              label={`${offset} days before`}
              selected
              onToggle={() => toggleOffset(offset)}
            />
          ))}
        </div>
        {!initial && sendNow ? (
          <p
            className={`mt-2 text-xs ${
              whatsappStatus && !whatsappStatus.canSend ? 'text-amber-800' : 'text-emerald-800'
            }`}
          >
            {whatsappStatus && !whatsappStatus.canSend
              ? 'WhatsApp Cloud API is not ready. Set WHATSAPP_ENABLED=true plus PHONE_NUMBER_ID and ACCESS_TOKEN in backend/.env, then restart. Recipients also need a WhatsApp number.'
              : 'WhatsApp Send now sends a normal session message with the reminder details to WHATSAPP_OWNER_NUMBERS (not a template). The number must have messaged this WhatsApp business account within 24 hours. Scheduled same-day send is unchanged.'}
          </p>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <Input
            label="Custom days before"
            type="number"
            min={0}
            value={customOffset}
            onChange={(e) => setCustomOffset(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={addCustomOffset}>
            Add rule
          </Button>
          <Input
            label="Send time (Dubai)"
            type="time"
            value={sendTimeLocal}
            onChange={(e) => setSendTimeLocal(e.target.value)}
          />
        </div>
        {previewDates.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <p className="font-medium text-slate-800">System-calculated occurrence dates</p>
            <ul className="mt-1 list-inside list-disc">
              {previewDates.map((row) => (
                <li key={row.offset}>
                  {row.offset === 0 ? 'Event day' : `${row.offset} days before`}: {row.date}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Owner"
          value={ownerUserId}
          onChange={(e) => setOwnerUserId(e.target.value)}
          options={[
            { value: '', label: 'Unassigned' },
            ...assignableStaff.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Recipients (active staff)</p>
          <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
            {assignableStaff.length === 0 ? (
              <p className="text-sm text-slate-500">No assignable staff available</p>
            ) : (
              assignableStaff.map((s) => (
                <Checkbox
                  key={s.id}
                  label={s.name}
                  checked={recipientUserIds.includes(s.id)}
                  onChange={() => toggleRecipient(s.id)}
                  className="w-full"
                />
              ))
            )}
          </div>
        </div>
      </div>

      <Textarea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

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
