'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, X, Building2, RefreshCw,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { TenantSummary, PlatformTenantStatus, PaginatedResponse } from '@/lib/platform-types'

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-foreground/40 hover:bg-foreground/5 hover:text-foreground/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open, onClose, title, description, onConfirm, loading, danger,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  onConfirm: () => void
  loading?: boolean
  danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="mb-5 text-sm text-foreground/60">{description}</p>}
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#E85D04] hover:bg-[#c94e03]'
          }`}
        >
          {loading ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Change Status modal ──────────────────────────────────────────────────────

const TENANT_STATUSES: PlatformTenantStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED']

function ChangeStatusModal({
  tenant, onClose, onSuccess,
}: {
  tenant: TenantSummary | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [newStatus, setNewStatus] = useState<PlatformTenantStatus | ''>('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // State is reset via key prop at the call site — no effect needed

  const mut = useMutation({
    mutationFn: () =>
      platformApi.tenants.changeStatus(tenant!.id, {
        status: newStatus as PlatformTenantStatus,
        ...(reason.trim() && { reason: reason.trim() }),
      }),
    onSuccess: () => {
      toast.success('Tenant status updated')
      onSuccess()
      onClose()
    },
    onError: (err) => setError(extractPlatformError(err)),
  })

  const handleSubmit = () => {
    if (!newStatus) { setError('Select a new status'); return }
    if (newStatus === tenant?.status) { setError('Status is already the same'); return }
    if (newStatus === 'SUSPENDED' && !reason.trim()) { setError('Reason is required when suspending'); return }
    setError('')
    mut.mutate()
  }

  return (
    <Modal open={!!tenant} onClose={onClose} title="Change Tenant Status">
      {tenant && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-foreground/3 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Current Status</p>
            <div className="mt-1.5">
              <StatusBadge status={tenant.status} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
              New Status
            </label>
            <div className="flex gap-2">
              {TENANT_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setNewStatus(s); setError('') }}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                    newStatus === s
                      ? s === 'ACTIVE'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : s === 'SUSPENDED'
                        ? 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'border-border bg-foreground/8 text-foreground/70'
                      : 'border-border text-foreground/50 hover:border-foreground/20 hover:bg-foreground/5'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Reason {newStatus === 'SUSPENDED' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError('') }}
              rows={3}
              placeholder="Describe the reason for this status change…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-[#E85D04]/50 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={mut.isPending}
              className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
            >
              {mut.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Create Tenant modal ──────────────────────────────────────────────────────

interface CreateTenantForm {
  station_code: string
  station_name: string
  owner_name: string
  email: string
  contact_number: string
  address: string
  district: string
  status: PlatformTenantStatus
}

const INITIAL_CREATE: CreateTenantForm = {
  station_code: '',
  station_name: '',
  owner_name: '',
  email: '',
  contact_number: '',
  address: '',
  district: '',
  status: 'ACTIVE',
}

function CreateTenantModal({
  open, onClose, onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (id?: string) => void
}) {
  const [form, setForm] = useState<CreateTenantForm>(INITIAL_CREATE)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateTenantForm, string>>>({})
  const [apiError, setApiError] = useState('')

  // State is reset via key prop at the call site — no effect needed

  const set = (key: keyof CreateTenantForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
    setApiError('')
  }

  const validate = () => {
    const e: Partial<Record<keyof CreateTenantForm, string>> = {}
    const code = form.station_code.trim().toUpperCase()
    if (!code) e.station_code = 'Required'
    else if (!/^[A-Z0-9-]{2,30}$/.test(code)) e.station_code = 'Letters, numbers, hyphens only (2–30 chars)'
    if (!form.station_name.trim()) e.station_name = 'Required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mut = useMutation({
    mutationFn: () =>
      platformApi.tenants.create({
        station_code: form.station_code.trim().toUpperCase(),
        station_name: form.station_name.trim(),
        ...(form.owner_name.trim() && { owner_name: form.owner_name.trim() }),
        ...(form.email.trim() && { email: form.email.trim() }),
        ...(form.contact_number.trim() && { contact_number: form.contact_number.trim() }),
        ...(form.address.trim() && { address: form.address.trim() }),
        ...(form.district.trim() && { district: form.district.trim() }),
        status: form.status,
      }),
    onSuccess: (res) => {
      toast.success('Tenant created')
      const id = (res.data as { id?: string })?.id
      onSuccess(id)
    },
    onError: (err) => setApiError(extractPlatformError(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mut.mutate()
  }

  const inputCls = (hasErr?: boolean) =>
    `w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none transition-colors ${
      hasErr ? 'border-rose-500/50 focus:border-rose-500/70' : 'border-border focus:border-[#E85D04]/50'
    }`

  return (
    <Modal open={open} onClose={onClose} title="Create Tenant" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Station Code <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.station_code}
              onChange={(e) => set('station_code', e.target.value.toUpperCase())}
              className={`${inputCls(!!errors.station_code)} font-mono uppercase tracking-widest`}
              placeholder="CPC001"
            />
            {errors.station_code && <p className="mt-1 text-xs text-rose-500">{errors.station_code}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Station Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.station_name}
              onChange={(e) => set('station_name', e.target.value)}
              className={inputCls(!!errors.station_name)}
              placeholder="Colombo Station"
            />
            {errors.station_name && <p className="mt-1 text-xs text-rose-500">{errors.station_name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">Owner Name</label>
            <input
              value={form.owner_name}
              onChange={(e) => set('owner_name', e.target.value)}
              className={inputCls()}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputCls(!!errors.email)}
              placeholder="owner@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">Contact Number</label>
            <input
              value={form.contact_number}
              onChange={(e) => set('contact_number', e.target.value)}
              className={inputCls()}
              placeholder="+94 77 123 4567"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">District</label>
            <input
              value={form.district}
              onChange={(e) => set('district', e.target.value)}
              className={inputCls()}
              placeholder="Colombo"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">Address</label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className={inputCls()}
              placeholder="Street address"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/50">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={inputCls()}
            >
              {TENANT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {apiError && (
          <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mut.isPending}
            className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
          >
            {mut.isPending ? 'Creating…' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Actions dropdown ─────────────────────────────────────────────────────────

interface ActionItem {
  label: string
  onClick: () => void
  danger?: boolean
  hidden?: boolean
}

function ActionMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const visible = items.filter((i) => !i.hidden)
  if (visible.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="rounded p-1.5 text-foreground/40 hover:bg-foreground/8 hover:text-foreground/60 transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg">
          {visible.map((item) => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); item.onClick() }}
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
                item.danger ? 'text-rose-600 hover:bg-rose-500/8' : 'text-foreground/70 hover:bg-foreground/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sort / filter types ──────────────────────────────────────────────────────

type SortField = 'station_name' | 'created_at' | 'status' | 'district'
type SortDir = 'ASC' | 'DESC'
type StatusFilter = PlatformTenantStatus | 'ALL'

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: 'Station Name', value: 'station_name' },
  { label: 'Created Date', value: 'created_at' },
  { label: 'Status', value: 'status' },
  { label: 'District', value: 'district' },
]

const STATUS_TABS: StatusFilter[] = ['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED']

const LIMIT = 20

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformTenantsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { hasRole } = usePlatformAuth()
  const canWrite = hasRole('ADMIN')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [districtFilter, setDistrictFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortDir>('DESC')
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [changeStatusTenant, setChangeStatusTenant] = useState<TenantSummary | null>(null)
  const [resetTenant, setResetTenant] = useState<TenantSummary | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const params = {
    page,
    limit: LIMIT,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(districtFilter !== 'ALL' && { district: districtFilter }),
    sort_by: sortBy,
    sort_order: sortOrder,
  }

  const tenantsQ = useQuery<PaginatedResponse<TenantSummary>>({
    queryKey: ['platform', 'tenants', params],
    queryFn: async () => {
      const res = await platformApi.tenants.list(params as Record<string, unknown>)
      return res.data as PaginatedResponse<TenantSummary>
    },
    staleTime: 30_000,
  })

  const tenants = useMemo(() => tenantsQ.data?.data ?? [], [tenantsQ.data])
  const total = tenantsQ.data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const districts = useMemo(
    () => [...new Set(tenants.map((t) => t.district).filter(Boolean) as string[])].sort(),
    [tenants],
  )

  const resetSessionsMut = useMutation({
    mutationFn: (id: string) => platformApi.tenants.resetSessions(id),
    onSuccess: () => { toast.success('Sessions revoked'); setResetTenant(null) },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })

  const isLoading = tenantsQ.isLoading
  const isEmpty = !isLoading && tenants.length === 0
  const hasFilters = !!debouncedSearch || statusFilter !== 'ALL' || districtFilter !== 'ALL'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Tenants</h1>
          <p className="mt-0.5 text-sm text-foreground/50">Manage all CPC station tenants</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2 font-syne text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
          >
            <Plus size={15} />
            New Tenant
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search station, code, owner, email"
            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-foreground/40 focus:border-[#E85D04]/50 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s ? 'bg-[#E85D04] text-white' : 'text-foreground/50 hover:text-foreground/70'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {districts.length > 0 && (
          <select
            value={districtFilter}
            onChange={(e) => { setDistrictFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-[#E85D04]/50 focus:outline-none"
          >
            <option value="ALL">All Districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortField); setPage(1) }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-[#E85D04]/50 focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button
          onClick={() => { setSortOrder((v) => (v === 'ASC' ? 'DESC' : 'ASC')); setPage(1) }}
          className="rounded-lg border border-border bg-card p-2 text-foreground/50 hover:bg-foreground/5 transition-colors"
          title={`Sort ${sortOrder}`}
        >
          {sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        </button>

        <button
          onClick={invalidateList}
          className="rounded-lg border border-border bg-card p-2 text-foreground/40 hover:bg-foreground/5 hover:text-foreground/60 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/3">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Station Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Code</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Owner</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">District</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Users</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Created</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-border/50">
                    {[36, 20, 28, 20, 8, 16, 24, 5].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded bg-foreground/8" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isEmpty ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Building2 size={28} className="mx-auto mb-3 text-foreground/20" />
                    <p className="text-sm font-medium text-foreground/50">No tenants found</p>
                    <p className="mt-1 text-xs text-foreground/40">Try adjusting your filters</p>
                    {hasFilters && (
                      <button
                        onClick={() => { setSearch(''); setStatusFilter('ALL'); setDistrictFilter('ALL') }}
                        className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/60 hover:bg-foreground/5 transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                tenants.map((tenant, i) => {
                  const portalUserCount = (tenant as TenantSummary & { portalUserCount?: number }).portalUserCount
                  return (
                    <tr
                      key={tenant.id}
                      className={`border-b border-border/50 last:border-0 hover:bg-[#E85D04]/4 transition-colors ${i % 2 !== 0 ? 'bg-foreground/2' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/platform/tenants/${tenant.id}`}
                          className="font-semibold text-foreground hover:text-[#E85D04] transition-colors"
                        >
                          {tenant.stationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground/50">{tenant.stationCode}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground/60">{tenant.ownerName ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-foreground/50">{tenant.district ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-xs text-foreground/50">
                          {portalUserCount ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground/40">{formatDate(tenant.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          items={[
                            { label: 'View Details', onClick: () => router.push(`/platform/tenants/${tenant.id}`) },
                            { label: 'Change Status', onClick: () => setChangeStatusTenant(tenant), hidden: !canWrite },
                            { label: 'View Settings', onClick: () => router.push(`/platform/tenants/${tenant.id}/settings`) },
                            { label: 'View Activity', onClick: () => router.push(`/platform/activity-logs?tenant_id=${tenant.id}`) },
                            { label: 'Reset Sessions', onClick: () => setResetTenant(tenant), danger: true, hidden: !canWrite },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border bg-foreground/3 px-4 py-2.5">
          <span className="font-mono text-xs text-foreground/40">
            {total === 0 ? '0 records' : `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="min-w-[60px] text-center font-mono text-xs text-foreground/50">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTenantModal
        key={createOpen ? 'modal-open' : 'modal-closed'}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(id) => {
          invalidateList()
          setCreateOpen(false)
          if (id) router.push(`/platform/tenants/${id}`)
        }}
      />

      <ChangeStatusModal
        key={changeStatusTenant?.id ?? 'none'}
        tenant={changeStatusTenant}
        onClose={() => setChangeStatusTenant(null)}
        onSuccess={() => {
          invalidateList()
          if (changeStatusTenant) {
            queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', changeStatusTenant.id] })
          }
        }}
      />

      <ConfirmModal
        open={!!resetTenant}
        onClose={() => setResetTenant(null)}
        title="Reset Tenant Sessions"
        description="This will revoke all active sessions for users in this tenant. They will need to log in again."
        onConfirm={() => resetTenant && resetSessionsMut.mutate(resetTenant.id)}
        loading={resetSessionsMut.isPending}
        danger
      />
    </div>
  )
}
