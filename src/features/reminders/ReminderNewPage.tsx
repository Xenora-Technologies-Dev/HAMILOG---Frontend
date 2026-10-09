import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { ReminderForm } from '@/features/reminders/ReminderForm'
import { ApiError } from '@/services/apiClient'
import { createReminder, listReminderCategories, type ReminderCategory } from '@/services/reminderService'
import { listStaff, type StaffMember } from '@/services/staffService'
import { getWhatsAppStatus, type WhatsAppStatus } from '@/services/whatsappService'

export function ReminderNewPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ReminderCategory[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [cats, staffResult] = await Promise.all([
            listReminderCategories(),
            listStaff({ pageSize: 100, isActive: true }),
          ])
          let waStatus: WhatsAppStatus | null = null
          try {
            waStatus = (await getWhatsAppStatus()).data
          } catch {
            waStatus = null
          }
          if (!cancelled) {
            setCategories(cats.data)
            setStaff(staffResult.data)
            setWhatsappStatus(waStatus)
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : 'Unable to load form data')
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
  }, [])

  if (loading) return <LoadingState label="Preparing reminder form…" />
  if (error) return <ErrorState message={error} />
  if (categories.length === 0) {
    return (
      <EmptyState
        title="No reminder categories"
        description="Seed reminder categories before creating events."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="New Reminder"
        description="Create an independent important event. Occurrence dates are calculated by the system."
        breadcrumb={<span>Home / Reminders / New</span>}
      />
      <Card>
        <ReminderForm
          categories={categories}
          staff={staff}
          whatsappStatus={whatsappStatus}
          busy={busy}
          error={formError}
          submitLabel="Create reminder"
          onCancel={() => navigate('/reminders')}
          onSubmit={async (payload) => {
            setBusy(true)
            setFormError(null)
            try {
              const created = await createReminder(payload)
              navigate(`/reminders/${created.data.id}`, { state: { sendNow: created.sendNow } })
            } catch (err) {
              setFormError(err instanceof ApiError ? err.message : 'Unable to create reminder')
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
