import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { ReminderForm } from '@/features/reminders/ReminderForm'
import { ApiError } from '@/services/apiClient'
import {
  getReminder,
  listReminderCategories,
  updateReminder,
  type Reminder,
  type ReminderCategory,
} from '@/services/reminderService'
import { listStaff, type StaffMember } from '@/services/staffService'

export function ReminderEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reminder, setReminder] = useState<Reminder | null>(null)
  const [categories, setCategories] = useState<ReminderCategory[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [detail, cats, staffResult] = await Promise.all([
            getReminder(id),
            listReminderCategories(),
            listStaff({ pageSize: 100, isActive: true }),
          ])
          if (!cancelled) {
            setReminder(detail.data)
            setCategories(cats.data)
            setStaff(staffResult.data)
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : 'Unable to load reminder')
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [id])

  if (loading) return <LoadingState label="Loading reminder…" />
  if (error || !reminder || !id) return <ErrorState message={error ?? 'Reminder not found'} />

  return (
    <div>
      <PageHeader
        title="Edit reminder"
        description="Update the event. Future dates follow the new date, time, and recurrence."
        breadcrumb={<span>Home / Reminders / Edit</span>}
      />
      <Card>
        <ReminderForm
          categories={categories}
          staff={staff}
          initial={reminder}
          busy={busy}
          error={formError}
          submitLabel="Save changes"
          onCancel={() => navigate(`/reminders/${id}`)}
          onSubmit={async (payload) => {
            setBusy(true)
            setFormError(null)
            try {
              await updateReminder(id, payload)
              navigate(`/reminders/${id}`)
            } catch (err) {
              setFormError(err instanceof ApiError ? err.message : 'Unable to update reminder')
              throw err
            } finally {
              setBusy(false)
            }
          }}
        />
      </Card>
    </div>
  )
}
