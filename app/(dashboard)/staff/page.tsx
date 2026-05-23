'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { staffApi } from '@/lib/api/staff'
import { api } from '@/lib/api/client'
import type { Staff, OperationalRole, PaginatedResponse } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  MANAGER:    'bg-blue-500/15 text-blue-400',
  PUMPER:     'bg-[#E85D04]/15 text-[#E85D04]',
  ACCOUNTANT: 'bg-purple-500/15 text-purple-400',
}

function RoleBadge({ name }: { name: string }) {
  const cls = ROLE_COLORS[name.toUpperCase()] ?? 'bg-white/10 text-white/50'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {name}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white',
    'placeholder:text-white/25 outline-none',
    hasError ? 'border-rose-500/50' : 'border-white/10 focus:border-[#E85D04]/60',
  ].join(' ')
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

// ─── Staff Form ───────────────────────────────────────────────────────────────

const staffSchema = z.object({
  employee_no:          z.string().min(1, 'Required'),
  name:                 z.string().min(1, 'Required'),
  phone:                z.string().optional(),
  nic:                  z.string().optional(),
  address:              z.string().optional(),
  operational_role_id:  z.string().min(1, 'Select a role'),
  basic_salary:         z.number().min(0).optional(),
  shift_rate:           z.number().min(0).optional(),
  ot_rate:              z.number().min(0).optional(),
  status:               z.enum(['ACTIVE', 'INACTIVE']),
})
type StaffForm = z.infer<typeof staffSchema>

function StaffFormContent({
  staff,
  roles,
  onSuccess,
}: {
  staff: Staff | null
  roles: OperationalRole[]
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: staff
      ? {
          employee_no:         staff.employee_no,
          name:                staff.name,
          phone:               staff.phone,
          nic:                 staff.nic,
          address:             staff.address,
          operational_role_id: staff.operational_role_id,
          basic_salary:        staff.basic_salary,
          shift_rate:          staff.shift_rate,
          ot_rate:             staff.ot_rate,
          status:              staff.status,
        }
      : { status: 'ACTIVE' as const },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (staff) {
        await staffApi.update(staff.id, data)
      } else {
        const { status: _status, ...createData } = data
        await staffApi.create(createData)
      }
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success(staff ? 'Staff updated' : 'Staff member added')
      onSuccess()
    } catch {
      toast.error('Failed to save staff member')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Employee No." error={errors.employee_no?.message}>
          <input
            {...register('employee_no')}
            placeholder="EMP-001"
            className={inputCls(!!errors.employee_no) + ' number'}
          />
        </Field>
        <Field label="Full Name" error={errors.name?.message}>
          <input
            {...register('name')}
            placeholder="Full Name"
            className={inputCls(!!errors.name)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="NIC" error={errors.nic?.message}>
          <input
            {...register('nic')}
            placeholder="NIC number"
            className={inputCls(false) + ' number'}
          />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input
            {...register('phone')}
            placeholder="+94 77 000 0000"
            className={inputCls(false)}
          />
        </Field>
      </div>
      <Field label="Address" error={errors.address?.message}>
        <input
          {...register('address')}
          placeholder="Address"
          className={inputCls(false)}
        />
      </Field>
      <Field label="Operational Role" error={errors.operational_role_id?.message}>
        <select
          {...register('operational_role_id')}
          className={inputCls(!!errors.operational_role_id) + ' cursor-pointer'}
        >
          <option value="" className="bg-[#18181C]">Select role…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id} className="bg-[#18181C]">
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Basic Salary" error={errors.basic_salary?.message}>
          <input
            {...register('basic_salary', {
              setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
            })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={inputCls(false) + ' number'}
          />
        </Field>
        <Field label="Shift Rate" error={errors.shift_rate?.message}>
          <input
            {...register('shift_rate', {
              setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
            })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={inputCls(false) + ' number'}
          />
        </Field>
        <Field label="OT Rate" error={errors.ot_rate?.message}>
          <input
            {...register('ot_rate', {
              setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
            })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={inputCls(false) + ' number'}
          />
        </Field>
      </div>
      {staff && (
        <Field label="Status" error={errors.status?.message}>
          <select
            {...register('status')}
            className={inputCls(!!errors.status) + ' cursor-pointer'}
          >
            <option value="ACTIVE"   className="bg-[#18181C]">Active</option>
            <option value="INACTIVE" className="bg-[#18181C]">Inactive</option>
          </select>
        </Field>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Saving…' : staff ? 'Save Changes' : 'Add Staff'}
      </button>
    </form>
  )
}

// ─── Role tabs ────────────────────────────────────────────────────────────────

const ROLE_TABS = ['ALL', 'MANAGER', 'PUMPER', 'ACCOUNTANT'] as const
type RoleTab = (typeof ROLE_TABS)[number]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const queryClient = useQueryClient()
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [search, setSearch]       = useState('')
  const [roleTab, setRoleTab]     = useState<RoleTab>('ALL')
  const [drawerStaff, setDrawerStaff] = useState<Staff | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

  // Fetch operational roles for tabs and form dropdown
  const rolesQuery = useQuery({
    queryKey: ['operational-roles', { limit: 50 }],
    queryFn: () => staffApi.listRoles({ limit: 50 }).then((r) => r.data),
  })
  const roles: OperationalRole[] = rolesQuery.data?.data ?? []

  // Resolve selected role ID from tab name
  const selectedRoleId = useMemo(() => {
    if (roleTab === 'ALL') return undefined
    return roles.find((r) => r.name.toUpperCase() === roleTab)?.id
  }, [roleTab, roles])

  // Fetch staff — pass operational_role_id as extra query param when filtered
  const filters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      ...(selectedRoleId && { operational_role_id: selectedRoleId }),
    }),
    [page, limit, search, selectedRoleId],
  )

  const staffQuery = useQuery({
    queryKey: ['staff', filters],
    queryFn: () =>
      api
        .get<PaginatedResponse<Staff>>('/staff', { params: filters })
        .then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setDeleteTarget(null)
      toast.success('Staff member deactivated')
    },
    onError: () => toast.error('Failed to deactivate staff member'),
  })

  const columns = useMemo<ColumnDef<Staff>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-white">{row.original.name}</p>
            <p className="number text-[10px] text-white/35">{row.original.employee_no}</p>
          </div>
        ),
      },
      {
        id: 'nic',
        header: 'NIC',
        cell: ({ row }) => (
          <span className="number text-xs text-white/50">{row.original.nic ?? '—'}</span>
        ),
      },
      {
        id: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <RoleBadge name={row.original.operational_role?.name ?? '—'} />
        ),
      },
      {
        id: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <span className="text-xs text-white/50">{row.original.phone ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'attendance',
        header: 'Attendance',
        cell: ({ row }) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              row.original.operational_role?.requires_attendance
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-white/5 text-white/25',
            )}
          >
            {row.original.operational_role?.requires_attendance ? 'Required' : 'No'}
          </span>
        ),
      },
      {
        id: 'shortfall',
        header: 'Shortfall',
        cell: ({ row }) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              row.original.operational_role?.liable_for_cash_shortfall
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-white/5 text-white/25',
            )}
          >
            {row.original.operational_role?.liable_for_cash_shortfall ? 'Liable' : 'No'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setDrawerStaff(row.original) }}
              className="rounded p-1.5 text-white/25 hover:bg-white/5 hover:text-white/60"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original) }}
              className="rounded p-1.5 text-white/25 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Staff"
        description="Manage operational staff and roles"
        actions={
          <button
            onClick={() => setDrawerStaff(null)}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
          >
            <Plus size={14} /> Add Staff
          </button>
        }
      />

      {/* Role filter tabs */}
      <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1 w-fit">
        {ROLE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setRoleTab(t); resetPage() }}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              roleTab === t
                ? 'bg-[#E85D04] text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={staffQuery.data?.data ?? []}
        total={staffQuery.data?.meta.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={staffQuery.isLoading}
        searchable
        onSearch={(q) => { setSearch(q); resetPage() }}
        emptyMessage="No staff found"
        onRowClick={(row) => setDrawerStaff(row)}
      />

      {/* Add / Edit Sheet */}
      <Sheet
        open={drawerStaff !== undefined}
        onOpenChange={(v) => !v && setDrawerStaff(undefined)}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[500px]"
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              {drawerStaff ? 'Edit Staff' : 'Add Staff'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {drawerStaff !== undefined && (
              <StaffFormContent
                staff={drawerStaff}
                roles={roles}
                onSuccess={() => setDrawerStaff(undefined)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Deactivate ${deleteTarget?.name ?? 'staff member'}?`}
        description="This performs a soft delete — the record is preserved but the staff member will be removed from active assignments."
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
