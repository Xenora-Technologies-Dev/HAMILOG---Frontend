import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import { CustomerFormModal } from '@/features/customers/CustomerFormModal'
import { ApiError } from '@/services/apiClient'
import {
  CUSTOMER_TYPE_LABELS,
  getCustomer,
  getCustomerEnquiries,
  getDuplicateMatchesFromError,
  updateCustomer,
  type CustomerDetail,
  type CustomerDuplicateMatch,
  type CustomerEnquiryHistoryItem,
  type UpdateCustomerPayload,
} from '@/services/customerService'
import { formatDubaiDateTime } from '@/utils/date'

export function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [enquiries, setEnquiries] = useState<CustomerEnquiryHistoryItem[]>([])
  const [enquiryPage, setEnquiryPage] = useState(1)
  const [enquiryTotalPages, setEnquiryTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [duplicateMatches, setDuplicateMatches] = useState<CustomerDuplicateMatch[] | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [customerResult, enquiryResult] = await Promise.all([
        getCustomer(id),
        getCustomerEnquiries(id, { page: enquiryPage, pageSize: 10 }),
      ])
      setCustomer(customerResult.data)
      setEnquiries(enquiryResult.data)
      setEnquiryTotalPages(enquiryResult.pagination.totalPages)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load customer detail')
    } finally {
      setLoading(false)
    }
  }, [id, enquiryPage])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function handleUpdate(payload: UpdateCustomerPayload) {
    if (!id) return
    setBusy(true)
    setFormError(null)
    try {
      await updateCustomer(id, payload)
      setEditOpen(false)
      setDuplicateMatches(null)
      await load()
    } catch (err) {
      const matches = getDuplicateMatchesFromError(err)
      if (matches) {
        setDuplicateMatches(matches)
        setFormError('Possible duplicate customer detected. Review and acknowledge to continue.')
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Unable to update customer')
      }
      throw err
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading customer detail..." />
  if (error || !customer) {
    return <ErrorState message={error ?? 'Customer not found'} onRetry={() => void load()} />
  }

  return (
    <div>
      <PageHeader
        title={customer.companyName}
        description={`${CUSTOMER_TYPE_LABELS[customer.customerType]} · ${customer.city || 'No city'} · ${customer.country}`}
        breadcrumb={
          <span>
            <Link to="/customers" className="hover:underline">
              Customers
            </Link>
            {' / '}
            Detail
          </span>
        }
        actions={
          <Can permission="customers.update">
            <Button
              onClick={() => {
                setFormError(null)
                setDuplicateMatches(null)
                setEditOpen(true)
              }}
            >
              Edit
            </Button>
          </Can>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Basic information">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Company</dt>
              <dd className="font-medium text-slate-900">{customer.companyName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Contact</dt>
              <dd className="font-medium text-slate-900">{customer.contactName || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mobile</dt>
              <dd className="font-medium text-slate-900">{customer.mobile || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">WhatsApp</dt>
              <dd className="font-medium text-slate-900">{customer.whatsappNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{customer.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Address</dt>
              <dd className="font-medium text-slate-900">
                {[customer.address, customer.addressLine2].filter(Boolean).join(', ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <Badge tone={customer.isActive ? 'success' : 'danger'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Location & notes">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">City</dt>
              <dd className="font-medium text-slate-900">{customer.city || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Country</dt>
              <dd className="font-medium text-slate-900">{customer.country}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Created by</dt>
              <dd className="font-medium text-slate-900">
                {customer.createdBy?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="font-medium text-slate-900">
                {formatDubaiDateTime(customer.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Notes</dt>
              <dd className="whitespace-pre-wrap font-medium text-slate-900">
                {customer.notes || '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Enquiry summary">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Total enquiries</dt>
              <dd className="text-2xl font-semibold text-slate-900">{customer.enquiryCount}</dd>
            </div>
            <p className="text-slate-500">
              Enquiry history below reuses the customer enquiry API — not a separate CRM list.
            </p>
            {!customer.isActive ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Inactive customers are hidden from default enquiry creation lookup.
              </p>
            ) : null}
          </dl>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Enquiry history" description="Linked enquiries for this customer.">
          <Table
            rows={enquiries}
            empty={
              <EmptyState
                title="No enquiries yet"
                description="Enquiries created for this customer will appear here."
              />
            }
            columns={[
              {
                key: 'number',
                header: 'Enquiry #',
                render: (row) => (
                  <Link className="font-medium text-slate-900 hover:underline" to={`/enquiries`}>
                    {row.enquiryNumber}
                  </Link>
                ),
              },
              { key: 'title', header: 'Title', render: (row) => row.title },
              { key: 'stage', header: 'Stage', render: (row) => row.stage },
              { key: 'priority', header: 'Priority', render: (row) => row.priority },
              {
                key: 'assigned',
                header: 'Assigned staff',
                render: (row) => row.assignedStaff?.name || '—',
              },
              {
                key: 'date',
                header: 'Date',
                render: (row) => formatDubaiDateTime(row.createdAt),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <Badge tone="neutral">{row.status}</Badge>,
              },
            ]}
          />

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <p>
              Page {enquiryPage} of {enquiryTotalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={enquiryPage <= 1}
                onClick={() => setEnquiryPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={enquiryPage >= enquiryTotalPages}
                onClick={() => setEnquiryPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <CustomerFormModal
        open={editOpen}
        mode="edit"
        initial={customer}
        busy={busy}
        error={formError}
        duplicateMatches={duplicateMatches}
        onClose={() => {
          setEditOpen(false)
          setFormError(null)
          setDuplicateMatches(null)
        }}
        onSubmitUpdate={handleUpdate}
      />
    </div>
  )
}
