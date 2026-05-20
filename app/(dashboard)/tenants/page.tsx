'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Settings } from 'lucide-react'
import { toast } from 'sonner'

import { tenantsApi } from '@/lib/api/tenants'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Tenant, TenantSettings } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-[11px] text-white/40">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-[#E85D04]' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

// ─── Tenant Form ──────────────────────────────────────────────────────────────

const tenantSchema = z.object({
  station_code:   z.string().min(1, 'Required'),
  station_name:   z.string().min(1, 'Required'),
  owner_name:     z.string().optional(),
  address:        z.string().optional(),
  district:       z.string().optional(),
  contact_number: z.string().optional(),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  status:         z.enum(['ACTIVE', 'INACTIVE']),
})
type TenantForm = z.infer<typeof tenantSchema>

function TenantFormContent({
  tenant,
  onSuccess,
}: {
  tenant: Tenant | null
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: tenant
      ? {
          station_code:   tenant.station_code,
          station_name:   tenant.station_name,
          owner_name:     tenant.owner_name,
          address:        tenant.address,
          district:       tenant.district,
          contact_number: tenant.contact_number,
          email:          tenant.email,
          status:         tenant.status,
        }
      : { status: 'ACTIVE' as const },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = { ...data, email: data.email || undefined }
      if (tenant) {
        await tenantsApi.update(tenant.id, payload)
      } else {
        await tenantsApi.create(payload)
      }
      await queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success(tenant ? 'Tenant updated' : 'Tenant created')
      onSuccess()
    } catch {
      toast.error('Failed to save tenant')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* 2-column layout */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <Field label="Station Code" error={errors.station_code?.message}>
            <input
              {...register('station_code')}
              placeholder="STA-001"
              className={inputCls(!!errors.station_code) + ' number uppercase'}
            />
          </Field>
          <Field label="Station Name" error={errors.station_name?.message}>
            <input
              {...register('station_name')}
              placeholder="Colombo Station"
              className={inputCls(!!errors.station_name)}
            />
          </Field>
          <Field label="Owner Name" error={errors.owner_name?.message}>
            <input
              {...register('owner_name')}
              placeholder="Full Name"
              className={inputCls(false)}
            />
          </Field>
          <Field label="District" error={errors.district?.message}>
            <input
              {...register('district')}
              placeholder="Colombo"
              className={inputCls(false)}
            />
          </Field>
          <Field label="Address" error={errors.address?.message}>
            <input
              {...register('address')}
              placeholder="Address"
              className={inputCls(false)}
            />
          </Field>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Field label="Contact Number" error={errors.contact_number?.message}>
            <input
              {...register('contact_number')}
              placeholder="+94 11 000 0000"
              className={inputCls(false)}
            />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              placeholder="email@station.lk"
              className={inputCls(!!errors.email)}
            />
          </Field>
          {tenant && (
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
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Saving…' : tenant ? 'Save Changes' : 'Create Tenant'}
      </button>
    </form>
  )
}

// ─── Settings Form ────────────────────────────────────────────────────────────

function TenantSettingsForm({
  tenantId,
  onSuccess,
}: {
  tenantId: string
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState<Partial<TenantSettings>>({
    salary_deduction_enabled:          false,
    cash_shortfall_requires_approval:  false,
    night_shift_enabled:               false,
    night_stock_verification_required: false,
    allow_shift_overlap:               false,
    currency:                          'LKR',
    timezone:                          'Asia/Colombo',
    cpc_report_format:                 'DEFAULT',
  })

  // Load existing settings — the GET /tenants/:id likely includes settings
  useQuery({
    queryKey: ['tenant-settings-load', tenantId],
    queryFn: async () => {
      const r = await tenantsApi.getById(tenantId)
      // If the entity includes a `settings` field (varies by backend version)
      const entity = r.data as Tenant & { settings?: Partial<TenantSettings> }
      if (entity.settings) {
        setForm((prev) => ({ ...prev, ...entity.settings }))
      }
      return r.data
    },
  })

  const mutation = useMutation({
    mutationFn: (data: Partial<TenantSettings>) =>
      tenantsApi.updateSettings(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Settings saved')
      onSuccess()
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const toggle = (key: keyof TenantSettings) =>
    setForm((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="flex flex-col gap-0">
      <div className="divide-y divide-white/5">
        <ToggleRow
          label="Salary Deduction"
          description="Auto-deduct shortfalls from salary"
          checked={!!form.salary_deduction_enabled}
          onChange={() => toggle('salary_deduction_enabled')}
        />
        <ToggleRow
          label="Cash Shortfall Approval"
          description="Require approval before deducting shortfalls"
          checked={!!form.cash_shortfall_requires_approval}
          onChange={() => toggle('cash_shortfall_requires_approval')}
        />
        <ToggleRow
          label="Night Shift"
          description="Enable night shift sessions"
          checked={!!form.night_shift_enabled}
          onChange={() => toggle('night_shift_enabled')}
        />
        <ToggleRow
          label="Night Stock Verification"
          description="Require stock verification after night shifts"
          checked={!!form.night_stock_verification_required}
          onChange={() => toggle('night_stock_verification_required')}
        />
        <ToggleRow
          label="Allow Shift Overlap"
          description="Allow two shifts to run concurrently"
          checked={!!form.allow_shift_overlap}
          onChange={() => toggle('allow_shift_overlap')}
        />
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Field label="Currency">
          <input
            value={form.currency ?? 'LKR'}
            onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
            placeholder="LKR"
            className={inputCls(false) + ' number uppercase'}
          />
        </Field>
        <Field label="Timezone">
          <input
            value={form.timezone ?? 'Asia/Colombo'}
            onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
            placeholder="Asia/Colombo"
            className={inputCls(false)}
          />
        </Field>
        <Field label="CPC Report Format">
          <input
            value={form.cpc_report_format ?? 'DEFAULT'}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, cpc_report_format: e.target.value }))
            }
            placeholder="DEFAULT"
            className={inputCls(false)}
          />
        </Field>
      </div>

      <button
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending}
        className="mt-6 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {mutation.isPending ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}

// ─── Drawer state ─────────────────────────────────────────────────────────────

type DrawerMode =
  | { type: 'none' }
  | { type: 'tenant'; tenant: Tenant | null }
  | { type: 'settings'; tenant: Tenant }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user?.portal_role !== 'ADMIN') {
      router.replace('/')
    }
  }, [authLoading, user, router])

  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [search, setSearch] = useState('')
  const [drawer, setDrawer] = useState<DrawerMode>({ type: 'none' })

  const filters = useMemo(
    () => ({ page, limit, search: search || undefined }),
    [page, limit, search],
  )

  const query = useQuery({
    queryKey: ['tenants', filters],
    queryFn: () => tenantsApi.list(filters).then((r) => r.data),
    enabled: user?.portal_role === 'ADMIN',
  })

  const openAdd      = () => setDrawer({ type: 'tenant', tenant: null })
  const openEdit     = (t: Tenant) => setDrawer({ type: 'tenant', tenant: t })
  const openSettings = (t: Tenant) => setDrawer({ type: 'settings', tenant: t })

  const drawerOpen  = drawer.type !== 'none'
  const sheetWidth  = drawer.type === 'tenant' ? 'sm:max-w-[680px]' : 'sm:max-w-[440px]'
  const drawerTitle =
    drawer.type === 'tenant'
      ? drawer.tenant ? 'Edit Tenant' : 'New Tenant'
      : drawer.type === 'settings'
        ? `Settings — ${drawer.tenant.station_name}`
        : ''

  const columns = useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        id: 'station_code',
        header: 'Code',
        cell: ({ row }) => (
          <span className="number text-xs font-medium text-white/70">
            {row.original.station_code}
          </span>
        ),
      },
      {
        id: 'station_name',
        header: 'Station',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-white">{row.original.station_name}</p>
            {row.original.owner_name && (
              <p className="text-[10px] text-white/40">{row.original.owner_name}</p>
            )}
          </div>
        ),
      },
      {
        id: 'district',
        header: 'District',
        cell: ({ row }) => (
          <span className="text-xs text-white/50">{row.original.district ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'created',
        header: 'Created',
        cell: ({ row }) => (
          <span className="number text-xs text-white/40">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); openSettings(row.original) }}
              className="rounded p-1.5 text-white/25 hover:bg-white/5 hover:text-white/60"
            >
              <Settings size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(row.original) }}
              className="rounded p-1.5 text-white/25 hover:bg-white/5 hover:text-white/60"
            >
              <Pencil size={13} />
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  if (authLoading) return null

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Tenants"
        description="Station / tenant management — Admin only"
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
          >
            <Plus size={14} /> New Tenant
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        total={query.data?.meta.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={query.isLoading}
        searchable
        onSearch={(q) => { setSearch(q); resetPage() }}
        emptyMessage="No tenants found"
        onRowClick={openEdit}
      />

      <Sheet open={drawerOpen} onOpenChange={(v) => !v && setDrawer({ type: 'none' })}>
        <SheetContent
          side="right"
          className={`flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 ${sheetWidth}`}
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              {drawerTitle}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {drawer.type === 'tenant' && (
              <TenantFormContent
                tenant={drawer.tenant}
                onSuccess={() => setDrawer({ type: 'none' })}
              />
            )}
            {drawer.type === 'settings' && (
              <TenantSettingsForm
                tenantId={drawer.tenant.id}
                onSuccess={() => setDrawer({ type: 'none' })}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
