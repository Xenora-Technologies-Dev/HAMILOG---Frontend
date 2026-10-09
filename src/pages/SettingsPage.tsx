import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { Can } from '@/components/Can'
import { ApiError } from '@/services/apiClient'
import { getWhatsAppStatus, type WhatsAppStatus } from '@/services/whatsappService'

export function SettingsPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWhatsAppStatus()
      setStatus(res.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load WhatsApp status')
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

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Non-secret system status. Credentials stay on the server only."
        breadcrumb={<span>Home / Settings</span>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Company profile" description="Trading company details and default contact information.">
          <p className="text-sm text-slate-500">Configuration UI coming in a later phase.</p>
        </Card>

        <Can
          permission="whatsapp.view"
          fallback={
            <Card title="WhatsApp integration" description="Requires whatsapp.view permission.">
              <p className="text-sm text-slate-500">You do not have permission to view WhatsApp status.</p>
            </Card>
          }
        >
          <Card
            title="WhatsApp integration"
            description="Non-secret Cloud API status (tokens never shown)."
          >
            {loading ? <LoadingState label="Loading status…" /> : null}
            {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
            {!loading && !error && status ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Enabled</dt>
                  <dd>
                    <Badge tone={status.enabled ? 'success' : 'neutral'}>
                      {status.enabled ? 'Yes' : 'No'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Ready to send</dt>
                  <dd>
                    <Badge tone={status.canSend ? 'success' : 'warning'}>
                      {status.canSend ? 'Yes' : 'No'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Credentials</dt>
                  <dd>
                    <Badge tone={status.configured ? 'success' : 'warning'}>
                      {status.configured ? 'Present' : 'Incomplete'}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">API version</dt>
                  <dd>{status.apiVersion}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Template to approve</dt>
                  <dd>{status.templateReminder}</dd>
                </div>
                <div className="pt-2">
                  <Link to="/whatsapp" className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline">
                    Open WhatsApp log
                  </Link>
                </div>
              </dl>
            ) : null}

            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
              Each reminder is sent on its scheduled day and time with this one template. Two reminders
              due at the same moment are sent one after another.
            </p>
          </Card>
        </Can>

        <Card title="Reminder defaults" description="Default reminder offsets and send times.">
          <p className="text-sm text-slate-500">Managed via seed settings and reminder forms.</p>
        </Card>

        <Card title="Security" description="Session and access-related settings.">
          <p className="text-sm text-slate-500">
            Session cookies are HTTP-only; secrets remain in backend env.
          </p>
        </Card>
      </div>
    </div>
  )
}
