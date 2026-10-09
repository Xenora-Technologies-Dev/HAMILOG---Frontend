import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { ApiError } from '@/services/apiClient'
import { getStaff, type StaffDetail } from '@/services/staffService'
import { formatDubaiDateTime } from '@/utils/date'

export function StaffDetailPage() {
  const { id } = useParams()
  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const result = await getStaff(id)
          if (!cancelled) setStaff(result.data)
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : 'Unable to load staff detail')
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

  if (loading) return <LoadingState label="Loading staff detail..." />
  if (error || !staff) {
    return <ErrorState message={error ?? 'Staff member not found'} />
  }

  return (
    <div>
      <PageHeader
        title={staff.name}
        description={staff.email}
        breadcrumb={
          <span>
            <Link to="/staff" className="hover:underline">
              Staff
            </Link>
            {' / '}
            Detail
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Profile">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Username</dt>
              <dd className="font-medium text-slate-900">{staff.username}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mobile</dt>
              <dd className="font-medium text-slate-900">{staff.mobile || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">WhatsApp</dt>
              <dd className="font-medium text-slate-900">{staff.whatsappNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900">{staff.role.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <Badge tone={staff.isActive ? 'success' : 'danger'}>
                  {staff.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {!staff.isAssignable ? (
                  <span className="ml-2 text-xs text-slate-500">Not assignable</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="font-medium text-slate-900">{formatDubaiDateTime(staff.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Assigned enquiries" description="Placeholder for future CRM assignments.">
          <p className="text-sm text-slate-500">No enquiry module data yet.</p>
        </Card>

        <Card title="Assigned reminders" description="Placeholder for future reminder ownership.">
          <p className="text-sm text-slate-500">No reminder module data yet.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Recent activity" description="Placeholder timeline for staff-related audit events.">
          <p className="text-sm text-slate-500">Activity feed will be connected later.</p>
        </Card>
      </div>
    </div>
  )
}
