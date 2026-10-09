import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  CUSTOMER_TYPE_LABELS,
  type CreateCustomerPayload,
  type CustomerDetail,
  type CustomerDuplicateMatch,
  type CustomerListItem,
  type CustomerType,
  type UpdateCustomerPayload,
} from '@/services/customerService'

type CustomerFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial?: CustomerListItem | CustomerDetail | null
  busy?: boolean
  error?: string | null
  duplicateMatches?: CustomerDuplicateMatch[] | null
  onClose: () => void
  onSubmitCreate?: (payload: CreateCustomerPayload) => Promise<void>
  onSubmitUpdate?: (payload: UpdateCustomerPayload) => Promise<void>
}

const typeOptions = (Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[]).map((value) => ({
  value,
  label: CUSTOMER_TYPE_LABELS[value],
}))

function duplicateReasonLabel(reason: CustomerDuplicateMatch['reason']) {
  switch (reason) {
    case 'COMPANY_AND_MOBILE':
      return 'Same company + mobile'
    case 'MOBILE':
      return 'Same mobile'
    case 'EMAIL':
      return 'Same email'
    default:
      return reason
  }
}

function CustomerFormFields({
  mode,
  initial,
  busy,
  error,
  duplicateMatches,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: Omit<CustomerFormModalProps, 'open'>) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '')
  const [customerType, setCustomerType] = useState<CustomerType>(initial?.customerType ?? 'COMPANY')
  const [contactName, setContactName] = useState(initial?.contactName ?? '')
  const [mobile, setMobile] = useState(initial?.mobile ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsappNumber ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [country, setCountry] = useState(initial?.country ?? 'United Arab Emirates')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [acknowledgeDuplicates, setAcknowledgeDuplicates] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (mode === 'create') {
      await onSubmitCreate?.({
        companyName,
        customerType,
        contactName: contactName || undefined,
        mobile: mobile || undefined,
        whatsappNumber: whatsappNumber || undefined,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        country: country || undefined,
        notes: notes || undefined,
        isActive,
        acknowledgeDuplicates: acknowledgeDuplicates || undefined,
      })
      return
    }

    await onSubmitUpdate?.({
      companyName,
      customerType,
      contactName: contactName || null,
      mobile: mobile || null,
      whatsappNumber: whatsappNumber || null,
      email: email || null,
      address: address || null,
      city: city || null,
      country: country || undefined,
      notes: notes || null,
      isActive,
      acknowledgeDuplicates: acknowledgeDuplicates || undefined,
    })
  }

  return (
    <Modal
      open
      title={mode === 'create' ? 'Add customer' : 'Edit customer'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button form="customer-form" type="submit" disabled={busy} busy={busy}>
            {busy ? 'Saving...' : mode === 'create' ? 'Create customer' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="customer-form" className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <Input
          label="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          minLength={2}
        />
        <Select
          label="Customer type"
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value as CustomerType)}
          options={typeOptions}
        />
        <Input
          label="Contact person"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Input
            label="WhatsApp number"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Checkbox
          label="Active customer"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />

        {duplicateMatches && duplicateMatches.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Possible duplicates found (not auto-merged):</p>
            <ul className="list-disc space-y-1 pl-5">
              {duplicateMatches.map((match) => (
                <li key={`${match.id}-${match.reason}`}>
                  {match.companyName}
                  {match.mobile ? ` · ${match.mobile}` : ''}
                  {match.email ? ` · ${match.email}` : ''}
                  <span className="text-amber-800"> ({duplicateReasonLabel(match.reason)})</span>
                </li>
              ))}
            </ul>
            <Checkbox
              label="I reviewed the matches and want to continue"
              checked={acknowledgeDuplicates}
              onChange={(e) => setAcknowledgeDuplicates(e.target.checked)}
              className="font-medium"
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}

export function CustomerFormModal(props: CustomerFormModalProps) {
  if (!props.open) return null
  return (
    <CustomerFormFields
      key={`${props.mode}-${props.initial?.id ?? 'new'}`}
      mode={props.mode}
      initial={props.initial}
      busy={props.busy}
      error={props.error}
      duplicateMatches={props.duplicateMatches}
      onClose={props.onClose}
      onSubmitCreate={props.onSubmitCreate}
      onSubmitUpdate={props.onSubmitUpdate}
    />
  )
}
