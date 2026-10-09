import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { StaffFormModal } from '@/features/staff/StaffFormModal'
import { usePermissions } from '@/hooks/usePermissions'
import { ApiError } from '@/services/apiClient'
import {
  activateStaff,
  createStaff,
  deactivateStaff,
  listStaff,
  listStaffRoles,
  updateStaff,
  type CreateStaffPayload,
  type StaffMember,
  type StaffRole,
  type UpdateStaffPayload,
} from '@/services/staffService'
import { formatDubaiDateTime } from '@/utils/date'

export function StaffListPage() {
  const { can } = usePermissions()
  const [rows, setRows] = useState<StaffMember[]>([])
  const [roles, setRoles] = useState<StaffRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [confirm, setConfirm] = useState<{ mode: 'activate' | 'deactivate'; staff: StaffMember } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [staffResult, rolesResult] = await Promise.all([
        listStaff({
          page,
          pageSize: 20,
          search: search.trim() || undefined,
          roleCode: roleCode || undefined,
          isActive: status === '' ? undefined : status === 'active',
        }),
        listStaffRoles(),
      ])
      setRows(staffResult.data)
      setTotalPages(staffResult.pagination.totalPages)
      setRoles(rolesResult.data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load staff')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleCode, status])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const roleOptions = useMemo(
    () => [
      { value: '', label: 'All roles' },
      ...roles.map((role) => ({ value: role.code, label: role.name })),
    ],
    [roles],
  )

  async function handleCreate(payload: CreateStaffPayload) {
    setBusy(true)
    setFormError(null)
    try {
      await createStaff(payload)
      setFormOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to create staff')
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdate(payload: UpdateStaffPayload) {
    if (!editing) return
    setBusy(true)
    setFormError(null)
    try {
      await updateStaff(editing.id, payload)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to update staff')
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
        await deactivateStaff(confirm.staff.id)
      } else {
        await activateStaff(confirm.staff.id)
      }
      setConfirm(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update staff status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage internal users, roles, and account status."
        breadcrumb={<span>Home / Staff</span>}
        actions={
          <Can permission="users.create">
            <Button
              onClick={() => {
                setFormError(null)
                setFormOpen(true)
              }}
            >
              Add staff
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
          placeholder="Name, email, mobile"
        />
        <Select
          label="Role"
          value={roleCode}
          onChange={(event) => {
            setPage(1)
            setRoleCode(event.target.value)
          }}
          options={roleOptions}
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

      {loading ? <LoadingState label="Loading staff..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <>
          <Table
            rows={rows}
            empty={
              <EmptyState title="No staff found" description="Try adjusting filters or add a new staff member." />
            }
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (row) => (
                  <Link className="font-medium text-slate-900 hover:underline" to={`/staff/${row.id}`}>
                    {row.name}
                  </Link>
                ),
              },
              { key: 'email', header: 'Email', render: (row) => row.email },
              { key: 'mobile', header: 'Mobile', render: (row) => row.mobile || '—' },
              { key: 'whatsapp', header: 'WhatsApp', render: (row) => row.whatsappNumber || '—' },
              { key: 'role', header: 'Role', render: (row) => row.role.name },
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
                key: 'created',
                header: 'Created',
                render: (row) => formatDubaiDateTime(row.createdAt),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {can('users.update') ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setFormError(null)
                          setEditing(row)
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {row.isActive && can('users.deactivate') ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setConfirm({ mode: 'deactivate', staff: row })}
                      >
                        Deactivate
                      </Button>
                    ) : null}
                    {!row.isActive && can('users.update') ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setConfirm({ mode: 'activate', staff: row })}
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

      <StaffFormModal
        open={formOpen}
        mode="create"
        roles={roles}
        busy={busy}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmitCreate={handleCreate}
      />

      <StaffFormModal
        open={Boolean(editing)}
        mode="edit"
        roles={roles}
        initial={editing}
        busy={busy}
        error={formError}
        onClose={() => setEditing(null)}
        onSubmitUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.mode === 'deactivate' ? 'Deactivate staff' : 'Activate staff'}
        message={
          confirm
            ? confirm.mode === 'deactivate'
              ? `Deactivate ${confirm.staff.name}? They will no longer be assignable.`
              : `Activate ${confirm.staff.name}?`
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
