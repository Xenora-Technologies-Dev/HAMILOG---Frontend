import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { FilterBar, Pagination } from '@/components/ui/FilterBar'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Table } from '@/components/ui/Table'
import { Can } from '@/components/Can'
import { CustomerFormModal } from '@/features/customers/CustomerFormModal'
import { usePermissions } from '@/hooks/usePermissions'
import { ApiError } from '@/services/apiClient'
import {
  activateCustomer,
  createCustomer,
  CUSTOMER_TYPE_LABELS,
  deactivateCustomer,
  getDuplicateMatchesFromError,
  listCustomers,
  updateCustomer,
  type CreateCustomerPayload,
  type CustomerDuplicateMatch,
  type CustomerListItem,
  type CustomerType,
  type UpdateCustomerPayload,
} from '@/services/customerService'
import { formatDubaiDateTime } from '@/utils/date'

export function CustomerListPage() {
  const { can } = usePermissions()
  const [rows, setRows] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [customerType, setCustomerType] = useState<CustomerType | ''>('')
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerListItem | null>(null)
  const [confirm, setConfirm] = useState<{
    mode: 'activate' | 'deactivate'
    customer: CustomerListItem
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [duplicateMatches, setDuplicateMatches] = useState<CustomerDuplicateMatch[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listCustomers({
        page,
        pageSize: 20,
        search: search.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        customerType: customerType || undefined,
        isActive: status === '' ? undefined : status === 'active',
      })
      setRows(result.data)
      setTotalPages(result.pagination.totalPages)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load customers')
    } finally {
      setLoading(false)
    }
  }, [page, search, city, country, customerType, status])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  function resetFormState() {
    setFormError(null)
    setDuplicateMatches(null)
  }

  async function handleCreate(payload: CreateCustomerPayload) {
    setBusy(true)
    setFormError(null)
    try {
      await createCustomer(payload)
      setFormOpen(false)
      resetFormState()
      await load()
    } catch (err) {
      const matches = getDuplicateMatchesFromError(err)
      if (matches) {
        setDuplicateMatches(matches)
        setFormError('Possible duplicate customer detected. Review and acknowledge to continue.')
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Unable to create customer')
      }
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdate(payload: UpdateCustomerPayload) {
    if (!editing) return
    setBusy(true)
    setFormError(null)
    try {
      await updateCustomer(editing.id, payload)
      setEditing(null)
      resetFormState()
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

  async function handleConfirm() {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.mode === 'deactivate') {
        await deactivateCustomer(confirm.customer.id)
      } else {
        await activateCustomer(confirm.customer.id)
      }
      setConfirm(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update customer status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Company and contact master for enquiry CRM."
        breadcrumb={<span>Home / Customers</span>}
        actions={
          <Can permission="customers.create">
            <Button
              onClick={() => {
                resetFormState()
                setFormOpen(true)
              }}
            >
              Add customer
            </Button>
          </Can>
        }
      />

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      >
        <Input
          label="Search"
          value={search}
          onChange={(event) => {
            setPage(1)
            setSearch(event.target.value)
          }}
          placeholder="Company, contact, mobile, email"
        />
        <Input
          label="City"
          value={city}
          onChange={(event) => {
            setPage(1)
            setCity(event.target.value)
          }}
          placeholder="City"
        />
        <Input
          label="Country"
          value={country}
          onChange={(event) => {
            setPage(1)
            setCountry(event.target.value)
          }}
          placeholder="Country"
        />
        <Select
          label="Customer type"
          value={customerType}
          onChange={(event) => {
            setPage(1)
            setCustomerType(event.target.value as CustomerType | '')
          }}
          options={[
            { value: '', label: 'All types' },
            ...Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setPage(1)
            setStatus(event.target.value)
          }}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </FilterBar>

      {loading ? <LoadingState label="Loading customers..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <>
          <Table
            rows={rows}
            empty={
              <EmptyState
                title="No customers found"
                description="Try adjusting filters or add a new customer."
              />
            }
            columns={[
              {
                key: 'company',
                header: 'Company',
                render: (row) => (
                  <div>
                    <Link className="font-medium text-slate-900 hover:underline" to={`/customers/${row.id}`}>
                      {row.companyName}
                    </Link>
                    <p className="text-xs text-slate-500">{CUSTOMER_TYPE_LABELS[row.customerType]}</p>
                  </div>
                ),
              },
              {
                key: 'contact',
                header: 'Contact',
                render: (row) => row.contactName || '—',
              },
              { key: 'mobile', header: 'Mobile', render: (row) => row.mobile || '—' },
              {
                key: 'whatsapp',
                header: 'WhatsApp',
                render: (row) => row.whatsappNumber || '—',
              },
              { key: 'email', header: 'Email', render: (row) => row.email || '—' },
              { key: 'city', header: 'City', render: (row) => row.city || '—' },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <Badge tone={row.isActive ? 'success' : 'danger'}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                key: 'enquiries',
                header: 'Enquiries',
                render: (row) => (
                  <div>
                    <p className="font-medium text-slate-900">{row.enquiryCount}</p>
                    <p className="text-xs text-slate-500">
                      {row.lastEnquiryAt ? formatDubaiDateTime(row.lastEnquiryAt) : '—'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {can('customers.update') ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          resetFormState()
                          setEditing(row)
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {row.isActive && can('customers.deactivate') ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirm({ mode: 'deactivate', customer: row })}
                      >
                        Deactivate
                      </Button>
                    ) : null}
                    {!row.isActive && can('customers.deactivate') ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConfirm({ mode: 'activate', customer: row })}
                      >
                        Activate
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrevious={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => value + 1)}
          />
        </>
      ) : null}

      <CustomerFormModal
        open={formOpen}
        mode="create"
        busy={busy}
        error={formError}
        duplicateMatches={duplicateMatches}
        onClose={() => {
          setFormOpen(false)
          resetFormState()
        }}
        onSubmitCreate={handleCreate}
      />

      <CustomerFormModal
        open={Boolean(editing)}
        mode="edit"
        initial={editing}
        busy={busy}
        error={formError}
        duplicateMatches={duplicateMatches}
        onClose={() => {
          setEditing(null)
          resetFormState()
        }}
        onSubmitUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.mode === 'deactivate' ? 'Deactivate customer' : 'Activate customer'}
        message={
          confirm
            ? confirm.mode === 'deactivate'
              ? `Deactivate ${confirm.customer.companyName}? They will no longer appear as default options for new enquiries. Historical enquiries stay intact.`
              : `Activate ${confirm.customer.companyName}?`
            : ''
        }
        confirmLabel={confirm?.mode === 'deactivate' ? 'Deactivate' : 'Activate'}
        danger={confirm?.mode === 'deactivate'}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  )
}
