'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, X, ClipboardList, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, RefreshCw, Mail, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { RegistrationAttempt, RegistrationStatus, PaginatedResponse } from '@/lib/platform-types'

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-foreground/40 hover:bg-foreground/5 hover:text-foreground/60">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  open, onClose, registration, onSuccess,
}: {
  open: boolean; onClose: () => void; registration: RegistrationAttempt | null; onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      platformApi.registrations.reject(registration!.id, { reason: reason.trim() || undefined }),
    onSuccess: () => {
      toast.success('Registration rejected')
      onSuccess()
      onClose()
    },
    onError: (err) => setError(extractPlatformError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Reject Registration">
      <div className="space-y-4">
        <p className="text-sm text-foreground/60">
          Rejecting registration for <strong>{registration?.email}</strong>
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError('') }}
            rows={3}
            placeholder="Describe why this registration is being rejected…"
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-rose-400/50 focus:outline-none"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
          >
            {mut.isPending ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({
  open, onClose, registration, onApprove, onReject, onResend,
}: {
  open: boolean
  onClose: () => void
  registration: RegistrationAttempt | null
  onApprove: () => void
  onReject: () => void
  onResend: () => void
}) {
  if (!registration) return null
  const isPending = registration.status === 'PENDING'

  return (
    <Modal open={open} onClose={onClose} title="Registration Details">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={registration.status} />
          <span className="font-mono text-xs text-foreground/40">{formatDate(registration.createdAt)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ['Email', registration.email],
            ['Name', registration.name],
            ['Station Code', registration.stationCode],
            ['Station Name', registration.stationName],
            ['District', registration.district],
            ['Contact', registration.contactNumber],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
              <p className="text-sm text-foreground/70">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {registration.address && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Address</p>
            <p className="text-sm text-foreground/70">{registration.address}</p>
          </div>
        )}

        {registration.rejectionReason && (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">Rejection Reason</p>
            <p className="text-sm text-rose-600 dark:text-rose-400">{registration.rejectionReason}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {isPending && (
            <>
              <button
                onClick={onApprove}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 size={14} /> Approve
              </button>
              <button
                onClick={onReject}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          {!isPending && (
            <button
              onClick={onResend}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors"
            >
              <Mail size={14} /> Resend Email
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Filters ──────────────────────────────────────────────────────────────────

type StatusFilter = RegistrationStatus | 'ALL'
const STATUS_TABS: StatusFilter[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']
const LIMIT = 25

type SortOrder = 'ASC' | 'DESC'

function SortIcon({ columnKey, sortBy, sortOrder }: { columnKey: string; sortBy: string; sortOrder: SortOrder }) {
  if (sortBy !== columnKey) return <ArrowUpDown size={11} className="ml-1 inline text-foreground/25" />
  return sortOrder === 'ASC'
    ? <ArrowUp size={11} className="ml-1 inline text-[#E85D04]" />
    : <ArrowDown size={11} className="ml-1 inline text-[#E85D04]" />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegistrationsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const [selected, setSelected] = useState<RegistrationAttempt | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const toggleSort = (key: string, defaultDir: SortOrder = 'DESC') => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortBy(key)
      setSortOrder(defaultDir)
    }
    setPage(1)
  }

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const params = {
    page, limit: LIMIT,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(debSearch && { search: debSearch }),
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
  }

  const listQ = useQuery<PaginatedResponse<RegistrationAttempt>>({
    queryKey: ['platform', 'registrations', params],
    queryFn: async () => {
      const res = await platformApi.registrations.list(params as Record<string, unknown>)
      return res.data as PaginatedResponse<RegistrationAttempt>
    },
    staleTime: 30_000,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['platform', 'registrations'] })

  const approveMut = useMutation({
    mutationFn: (id: string) => platformApi.registrations.approve(id),
    onSuccess: () => { toast.success('Registration approved'); refresh(); setDetailOpen(false) },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const resendMut = useMutation({
    mutationFn: (id: string) => platformApi.registrations.resend(id),
    onSuccess: () => { toast.success('Email resent'); setDetailOpen(false) },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const registrations = listQ.data?.data ?? []
  const total = listQ.data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const openDetail = (r: RegistrationAttempt) => { setSelected(r); setDetailOpen(true) }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Registrations</h1>
          <p className="mt-0.5 text-sm text-foreground/50">Review tenant registration requests</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-card p-0.5 w-fit">
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

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, station code…"
          className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-foreground/40 focus:border-[#E85D04]/50 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/3">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Email</th>
                <th
                  onClick={() => toggleSort('station_name', 'ASC')}
                  className="cursor-pointer select-none px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest transition-colors hover:text-[#E85D04]/70 text-foreground/40"
                >
                  Station
                  <SortIcon columnKey="station_name" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Code</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">District</th>
                <th
                  onClick={() => toggleSort('status', 'ASC')}
                  className="cursor-pointer select-none px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest transition-colors hover:text-[#E85D04]/70 text-foreground/40"
                >
                  Status
                  <SortIcon columnKey="status" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th
                  onClick={() => toggleSort('created_at', 'DESC')}
                  className="cursor-pointer select-none px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest transition-colors hover:text-[#E85D04]/70 text-foreground/40"
                >
                  Date
                  <SortIcon columnKey="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th className="px-4 py-3 w-16 text-center text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQ.isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-border/30">
                    {[48, 40, 20, 24, 16, 20, 10].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded bg-foreground/8" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <ClipboardList size={24} className="mx-auto mb-2 text-foreground/25" />
                    <p className="text-sm text-foreground/40">No registrations found</p>
                  </td>
                </tr>
              ) : (
                registrations.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-border/30 last:border-0 cursor-pointer hover:bg-foreground/3 transition-colors ${i % 2 !== 0 ? 'bg-foreground/2' : ''}`}
                    onClick={() => openDetail(r)}
                  >
                    <td className="px-4 py-3 text-foreground/70">{r.email}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{r.stationName}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground/50">{r.stationCode}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/50">{r.district ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground/40" title={formatDate(r.createdAt)}>
                        {formatRelativeTime(r.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {r.status === 'PENDING' && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => approveMut.mutate(r.id)}
                            disabled={approveMut.isPending}
                            title="Approve"
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={() => { setSelected(r); setRejectOpen(true) }}
                            title="Reject"
                            className="rounded p-1.5 text-rose-600 hover:bg-rose-500/10 transition-colors"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                      {r.status !== 'PENDING' && (
                        <button
                          onClick={() => resendMut.mutate(r.id)}
                          disabled={resendMut.isPending}
                          title="Resend email"
                          className="rounded p-1.5 text-foreground/50 hover:bg-foreground/8 transition-colors disabled:opacity-40"
                        >
                          <Mail size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
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
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="min-w-[50px] text-center font-mono text-xs text-foreground/50">{page}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        registration={selected}
        onApprove={() => { if (selected) approveMut.mutate(selected.id) }}
        onReject={() => { setDetailOpen(false); setRejectOpen(true) }}
        onResend={() => { if (selected) resendMut.mutate(selected.id) }}
      />
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        registration={selected}
        onSuccess={refresh}
      />
    </div>
  )
}
