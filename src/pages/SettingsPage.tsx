import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Can } from '@/components/Can'
import { usePermissions } from '@/hooks/usePermissions'
import { ApiError } from '@/services/apiClient'
import { getWhatsAppOwner, saveWhatsAppOwner } from '@/services/settingsService'
import { getWhatsAppStatus, type WhatsAppStatus } from '@/services/whatsappService'

export function SettingsPage() {
  const { can } = usePermissions()
  const canUpdateOwner = can('settings.update')
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerLoading, setOwnerLoading] = useState(true)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [ownerSaving, setOwnerSaving] = useState(false)
  const [ownerSaved, setOwnerSaved] = useState(false)

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

  const loadOwner = useCallback(async () => {
    setOwnerLoading(true)
    setOwnerError(null)
    try {
      const res = await getWhatsAppOwner()
      setOwnerName(res.data.name)
      setOwnerPhone(res.data.phone ?? '')
    } catch (err) {
      setOwnerError(err instanceof ApiError ? err.message : 'Unable to load the reminder owner')
    } finally {
      setOwnerLoading(false)
    }
  }, [])

  async function onSaveOwner(event: FormEvent) {
    event.preventDefault()
    setOwnerSaving(true)
    setOwnerSaved(false)
    setOwnerError(null)
    try {
      const res = await saveWhatsAppOwner({ name: ownerName.trim(), phone: ownerPhone.trim() })
      setOwnerName(res.data.name)
      setOwnerPhone(res.data.phone ?? '')
      setOwnerSaved(true)
    } catch (err) {
      setOwnerError(err instanceof ApiError ? err.message : 'Unable to save the reminder owner')
    } finally {
      setOwnerSaving(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
      void loadOwner()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load, loadOwner])

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Non-secret system status. Credentials stay on the server only."
        breadcrumb={<span>Home / Settings</span>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Reminder owner"
          description="9:00 and 17:00 WhatsApp reminders are sent to this person. Changes here replace the previous number."
        >
          {ownerLoading ? <LoadingState label="Loading owner…" /> : null}
          {!ownerLoading && ownerError && !ownerName ? (
            <ErrorState message={ownerError} onRetry={() => void loadOwner()} />
          ) : null}
          {!ownerLoading && (ownerName || !ownerError) ? (
            <form className="space-y-4" onSubmit={(event) => void onSaveOwner(event)}>
              <Input
                label="Owner name"
                name="ownerName"
                value={ownerName}
                onChange={(event) => {
                  setOwnerSaved(false)
                  setOwnerName(event.target.value)
                }}
                required
                disabled={!canUpdateOwner || ownerSaving}
                autoComplete="name"
              />
              <Input
                label="WhatsApp number"
                name="ownerPhone"
                value={ownerPhone}
                onChange={(event) => {
                  setOwnerSaved(false)
                  setOwnerPhone(event.target.value)
                }}
                required
                disabled={!canUpdateOwner || ownerSaving}
                inputMode="tel"
                autoComplete="tel"
                hint="Include the country code, for example +971501722409."
              />
              {ownerError ? <p className="text-sm text-rose-700">{ownerError}</p> : null}
              {ownerSaved ? <p className="text-sm text-emerald-700">Owner saved.</p> : null}
              <Can permission="settings.update">
                <Button type="submit" busy={ownerSaving}>
                  Save owner
                </Button>
              </Can>
            </form>
          ) : null}
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
                {status.templateEventAssigned ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Staff notice template</dt>
                    <dd>{status.templateEventAssigned}</dd>
                  </div>
                ) : null}
                <div className="pt-2">
                  <Link to="/whatsapp" className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline">
                    Open WhatsApp log
                  </Link>
                </div>
              </dl>
            ) : null}

            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
              Each reminder scheduled for that day is sent at 9:00 to the person who created the event, anyone
              assigned to it, and the reminder owner above. Each message uses that person's own name. The same
              phone number receives one message. At 17:00 they receive it again while the event is still open.
              Acknowledged events and ones moved to tomorrow are left out. Earlier days are not sent.
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
