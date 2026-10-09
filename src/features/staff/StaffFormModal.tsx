import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import type {
  CreateStaffPayload,
  StaffMember,
  StaffRole,
  UpdateStaffPayload,
} from '@/services/staffService'

type StaffFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  roles: StaffRole[]
  initial?: StaffMember | null
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSubmitCreate?: (payload: CreateStaffPayload) => Promise<void>
  onSubmitUpdate?: (payload: UpdateStaffPayload) => Promise<void>
}

function StaffFormFields({
  mode,
  roles,
  initial,
  busy,
  error,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: Omit<StaffFormModalProps, 'open'>) {
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [mobile, setMobile] = useState(initial?.mobile ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsappNumber ?? '')
  const [roleId, setRoleId] = useState(initial?.role.id ?? roles[0]?.id ?? '')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'create') {
      await onSubmitCreate?.({
        name,
        email,
        username: username || undefined,
        mobile: mobile || undefined,
        whatsappNumber: whatsappNumber || undefined,
        roleId,
        temporaryPassword,
        isActive,
      })
      return
    }
    await onSubmitUpdate?.({
      name,
      mobile: mobile || null,
      whatsappNumber: whatsappNumber || null,
      roleId,
      isActive,
    })
  }

  return (
    <Modal
      open
      title={mode === 'create' ? 'Add staff' : 'Edit staff'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button form="staff-form" type="submit" disabled={busy} busy={busy}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create staff' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="staff-form" className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={mode === 'edit'}
        />
        {mode === 'create' ? (
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            hint="Optional. Defaults from email local-part."
          />
        ) : (
          <Input label="Username" value={username} disabled />
        )}
        <Input label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        <Input
          label="WhatsApp number"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
        />
        <Select
          label="Role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          required
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
        />
        {mode === 'create' ? (
          <Input
            label="Temporary password"
            type="password"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            required
            minLength={8}
            hint="Minimum 8 characters. User should change this later."
          />
        ) : null}
        <Checkbox
          label="Active account"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}

export function StaffFormModal(props: StaffFormModalProps) {
  if (!props.open) return null
  return (
    <StaffFormFields
      key={`${props.mode}-${props.initial?.id ?? 'new'}`}
      mode={props.mode}
      roles={props.roles}
      initial={props.initial}
      busy={props.busy}
      error={props.error}
      onClose={props.onClose}
      onSubmitCreate={props.onSubmitCreate}
      onSubmitUpdate={props.onSubmitUpdate}
    />
  )
}
