import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Can } from '@/components/Can'
import { CustomerFormModal } from '@/features/customers/CustomerFormModal'
import { CustomerAsyncSearch } from '@/features/enquiries/EnquiryShared'
import { PRIORITY_OPTIONS, SOURCE_OPTIONS } from '@/features/enquiries/enquiryFormUtils'
import { usePermissions } from '@/hooks/usePermissions'
import { ApiError } from '@/services/apiClient'
import {
  createCustomer,
  getDuplicateMatchesFromError,
  type CreateCustomerPayload,
  type CustomerDuplicateMatch,
  type CustomerLookupItem,
} from '@/services/customerService'
import {
  createEnquiry,
  type EnquiryPriority,
  type EnquirySource,
} from '@/services/enquiryService'
import { listStaff, type StaffMember } from '@/services/staffService'

export function EnquiryNewPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [customer, setCustomer] = useState<CustomerLookupItem | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerFormError, setCustomerFormError] = useState<string | null>(null)
  const [duplicateMatches, setDuplicateMatches] = useState<CustomerDuplicateMatch[] | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productName, setProductName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [specification, setSpecification] = useState('')
  const [sizeDimension, setSizeDimension] = useState('')
  const [brand, setBrand] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactMobile, setContactMobile] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [source, setSource] = useState<EnquirySource>('OTHER')
  const [priority, setPriority] = useState<EnquiryPriority>('MEDIUM')
  const [assignedToId, setAssignedToId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [nextActionAt, setNextActionAt] = useState('')
  const [nextActionNote, setNextActionNote] = useState('')

  useEffect(() => {
    if (!can('enquiries.assign') && !can('users.view')) return
    void listStaff({ pageSize: 100, isActive: true })
      .then((res) => setStaff(res.data.filter((s) => s.isAssignable)))
      .catch(() => setStaff([]))
  }, [can])

  function handleSelectCustomer(next: CustomerLookupItem | null) {
    setCustomer(next)
    if (next) {
      setContactPerson((prev) => prev || next.contactName || '')
      setContactMobile((prev) => prev || next.mobile || '')
      setContactEmail((prev) => prev || next.email || '')
    }
  }

  const staffOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...staff.map((member) => ({ value: member.id, label: member.name })),
    ],
    [staff],
  )

  async function handleCreateCustomer(payload: CreateCustomerPayload) {
    setCustomerFormError(null)
    try {
      const created = await createCustomer(payload)
      handleSelectCustomer({
        id: created.data.id,
        companyName: created.data.companyName,
        customerType: created.data.customerType,
        contactName: created.data.contactName,
        mobile: created.data.mobile,
        whatsappNumber: created.data.whatsappNumber,
        email: created.data.email,
        city: created.data.city,
        country: created.data.country,
        isActive: created.data.isActive,
      })
      setCustomerModalOpen(false)
      setDuplicateMatches(null)
    } catch (err) {
      const matches = getDuplicateMatchesFromError(err)
      if (matches) {
        setDuplicateMatches(matches)
        setCustomerFormError('Possible duplicate. Acknowledge to continue.')
      } else {
        setCustomerFormError(err instanceof ApiError ? err.message : 'Unable to create customer')
      }
      throw err
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!customer) {
      setError('Select a customer before creating the enquiry.')
      return
    }
    if (title.trim().length < 2) {
      setError('Requirement title is required.')
      return
    }

    setBusy(true)
    try {
      const created = await createEnquiry({
        customerId: customer.id,
        title: title.trim(),
        description: description.trim() || undefined,
        productCategory: productCategory.trim() || undefined,
        productName: productName.trim() || undefined,
        quantity: quantity.trim() || undefined,
        unit: unit.trim() || undefined,
        specification: specification.trim() || undefined,
        sizeDimension: sizeDimension.trim() || undefined,
        brand: brand.trim() || undefined,
        deliveryLocation: deliveryLocation.trim() || undefined,
        requiredDeliveryDate: requiredDeliveryDate || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactMobile: contactMobile.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        source,
        priority,
        assignedToId: assignedToId || undefined,
        dueDate: dueDate || undefined,
        nextActionAt: nextActionAt || undefined,
        nextActionNote: nextActionNote.trim() || undefined,
      })
      navigate(`/enquiries/${created.data.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create enquiry')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="New enquiry"
        description="Capture customer requirement and CRM ownership details."
        breadcrumb={
          <span>
            Home / <Link to="/enquiries">Enquiries</Link> / New
          </span>
        }
      />

      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <ErrorState message={error} /> : null}

        <Card title="Customer" description="Search existing customers — avoid loading full directory.">
          <CustomerAsyncSearch selected={customer} onSelect={handleSelectCustomer} disabled={busy} />
          <Can permission="customers.create">
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCustomerFormError(null)
                  setDuplicateMatches(null)
                  setCustomerModalOpen(true)
                }}
              >
                Create customer
              </Button>
            </div>
          </Can>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Input
              label="Contact person"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
            <Input
              label="Mobile"
              value={contactMobile}
              onChange={(e) => setContactMobile(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
        </Card>

        <Card title="Requirement" description="Trading requirement details. Only title is mandatory.">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Stainless steel flanges DN100"
            />
            <Input
              label="Product / category"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
            />
            <Input
              label="Product name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <Input
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, kg, mt" />
            <Input
              label="Size / dimension"
              value={sizeDimension}
              onChange={(e) => setSizeDimension(e.target.value)}
            />
            <Input
              label="Delivery location"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
            />
            <Input
              label="Required delivery date"
              type="date"
              value={requiredDeliveryDate}
              onChange={(e) => setRequiredDeliveryDate(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <Textarea
              label="Description / specification"
              value={description || specification}
              onChange={(e) => {
                setDescription(e.target.value)
                setSpecification(e.target.value)
              }}
              placeholder="Specs, standards, packing, certificates…"
            />
          </div>
        </Card>

        <Card title="CRM" description="Source, priority, ownership, and next action.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Select
              label="Source"
              value={source}
              onChange={(e) => setSource(e.target.value as EnquirySource)}
              options={SOURCE_OPTIONS}
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as EnquiryPriority)}
              options={PRIORITY_OPTIONS}
            />
            <Can
              permission="enquiries.assign"
              fallback={
                <Input label="Assigned staff" value="Assign after create (no permission)" disabled />
              }
            >
              <Select
                label="Assigned staff"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                options={staffOptions}
              />
            </Can>
            <Input
              label="Due date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <Input
              label="Next follow-up"
              type="date"
              value={nextActionAt}
              onChange={(e) => setNextActionAt(e.target.value)}
            />
            <Input
              label="Next action"
              value={nextActionNote}
              onChange={(e) => setNextActionNote(e.target.value)}
              placeholder="Call buyer / send quote"
            />
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy} busy={busy}>
            {busy ? 'Creating…' : 'Create enquiry'}
          </Button>
          <ButtonLink to="/enquiries" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>

      <CustomerFormModal
        open={customerModalOpen}
        mode="create"
        busy={busy}
        error={customerFormError}
        duplicateMatches={duplicateMatches}
        onClose={() => setCustomerModalOpen(false)}
        onSubmitCreate={handleCreateCustomer}
      />
    </div>
  )
}
