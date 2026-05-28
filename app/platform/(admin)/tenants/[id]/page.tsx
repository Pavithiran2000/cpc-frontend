'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronRight, Settings, X, ArrowLeft,
  Users, Activity, Building2, Monitor, Laptop,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { formatDate, formatDateTime, formatRelativeTime, actionLabel } from '@/lib/utils'
import type { TenantDetail, TenantStats, TenantSession, PlatformTenantStatus, PaginatedResponse, PlatformActivityLog } from '@/lib/platform-types'

// ─── Local types ──────────────────────────────────────────────────────────────

interface TenantPortalUser {
  id: string
  name: string
  email: string
  portal_role: string
  status: string
  last_login_at: string | null
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function TenantStatusBadge({ status, large }: { status: string; large?: boolean }) {
  const cls =
    status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400'
      : status === 'SUSPENDED'
      ? 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400'
      : 'bg-foreground/8 text-foreground/50 border-border'
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${
        large ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
      } ${cls}`}
    >
      {status}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === 'ADMIN'
      ? 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400'
      : 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {role}
    </span>
  )
}

function UserStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400'
      : 'bg-foreground/8 text-foreground/50 border-border'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
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
          <button onClick={onClose} className="rounded p-1 text-foreground/40 hover:bg-foreground/5 hover:text-foreground/60 transition-colors">
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
  open: boolean; onClose: () => void; title: string
  description?: string; onConfirm: () => void; loading?: boolean; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="mb-5 text-sm text-foreground/60">{description}</p>}
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#E85D04] hover:bg-[#c94e03]'}`}
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
  open, currentStatus, onClose, onSuccess, tenantId,
}: {
  open: boolean; currentStatus: PlatformTenantStatus
  onClose: () => void; onSuccess: () => void; tenantId: string
}) {
  const [newStatus, setNewStatus] = useState<PlatformTenantStatus | ''>('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // State reset via key prop at call site — no effect needed

  const mut = useMutation({
    mutationFn: () =>
      platformApi.tenants.changeStatus(tenantId, {
        status: newStatus as PlatformTenantStatus,
        ...(reason.trim() && { reason: reason.trim() }),
      }),
    onSuccess: () => { toast.success('Tenant status updated'); onSuccess(); onClose() },
    onError: (err) => setError(extractPlatformError(err)),
  })

  const handleSubmit = () => {
    if (!newStatus) { setError('Select a new status'); return }
    if (newStatus === currentStatus) { setError('Status is already the same'); return }
    if (newStatus === 'SUSPENDED' && !reason.trim()) { setError('Reason is required when suspending'); return }
    setError('')
    mut.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Change Tenant Status">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-foreground/3 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Current Status</p>
          <div className="mt-1.5"><TenantStatusBadge status={currentStatus} /></div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">New Status</label>
          <div className="flex gap-2">
            {TENANT_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setNewStatus(s); setError('') }}
                className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  newStatus === s
                    ? s === 'ACTIVE' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600'
                      : s === 'SUSPENDED' ? 'border-rose-500/50 bg-rose-500/10 text-rose-600'
                      : 'border-foreground/25 bg-foreground/8 text-foreground'
                    : 'border-border text-foreground/50 hover:border-foreground/30 hover:bg-foreground/5'
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
            placeholder="Describe the reason…"
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-[#E85D04]/50 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors">
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
    </Modal>
  )
}

// ─── Info card ────────────────────────────────────────────────────────────────

function InfoCard({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40">{label}</p>
      <p className={`mt-2 text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-foreground/25">—</span>}
      </p>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, loading }: { label: string; value: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-foreground/8" />
      ) : (
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">{value ?? '—'}</p>
      )}
    </div>
  )
}

// ─── Skeleton header ──────────────────────────────────────────────────────────

function SkeletonHeader() {
  return (
    <div className="mb-6 animate-pulse">
      <div className="mb-4 flex gap-1.5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-3 w-20 rounded bg-foreground/8" />)}
      </div>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded bg-foreground/8" />
          <div className="h-4 w-32 rounded bg-foreground/6" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-foreground/8" />
          <div className="h-9 w-28 rounded-lg bg-foreground/8" />
        </div>
      </div>
    </div>
  )
}

// ─── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab({ tenantId, canWrite }: { tenantId: string; canWrite: boolean }) {
  const queryClient = useQueryClient()

  const sessionsQ = useQuery<TenantSession[]>({
    queryKey: ['platform', 'tenant', tenantId, 'sessions'],
    queryFn: async () => {
      const res = await platformApi.tenants.getSessions(tenantId)
      const d = res.data as TenantSession[] | { data?: TenantSession[] }
      return Array.isArray(d) ? d : (d.data ?? [])
    },
    staleTime: 30_000,
  })

  const revokeMut = useMutation({
    mutationFn: (sessionId: string) =>
      platformApi.tenants.revokeSession(tenantId, sessionId),
    onSuccess: () => {
      toast.success('Session revoked')
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', tenantId, 'sessions'] })
    },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const sessions = sessionsQ.data ?? []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-foreground/50">
          {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {sessionsQ.isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border bg-card text-center">
          <Monitor size={24} className="mb-2 text-foreground/25" />
          <p className="text-sm text-foreground/40">No active sessions</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const ua = session.userAgent ?? ''
            const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] ?? 'Unknown browser'
            return (
              <div key={session.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/8">
                  <Laptop size={16} className="text-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/70 truncate">{session.userName ?? session.userEmail}</p>
                  <p className="text-xs text-foreground/40 truncate">
                    {browser} · {session.ipAddress ?? 'Unknown IP'}
                    {session.lastActiveAt && <> · Last active {formatRelativeTime(session.lastActiveAt)}</>}
                  </p>
                </div>
                {canWrite && (
                  <button
                    onClick={() => revokeMut.mutate(session.id)}
                    disabled={revokeMut.isPending}
                    title="Revoke session"
                    className="shrink-0 rounded p-1.5 text-foreground/40 hover:bg-rose-500/10 hover:text-rose-600 transition-colors disabled:opacity-40"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'sessions' | 'activity' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Portal Users' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
]

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ tenant }: { tenant: TenantDetail }) {
  const settingsEntries = Object.entries(tenant.settings ?? {})

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/40">Station Details</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Station Name" value={tenant.stationName} />
          <InfoCard label="Station Code" value={<span className="font-mono">{tenant.stationCode}</span>} />
          <InfoCard label="Owner Name" value={tenant.ownerName} />
          <InfoCard label="Email" value={tenant.email} />
          <InfoCard label="Contact" value={tenant.contactNumber} />
          <InfoCard label="District" value={tenant.district} />
        </div>
      </div>

      {tenant.address && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/40">Address</h3>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-foreground/70">{tenant.address}</p>
          </div>
        </div>
      )}

      {settingsEntries.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/40">Settings Summary</h3>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {settingsEntries.slice(0, 8).map(([key, value], i) => (
              <div key={key} className={`flex items-center justify-between px-5 py-3 ${i !== 0 ? 'border-t border-border/30' : ''}`}>
                <span className="text-sm text-foreground/60">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                <span className="font-mono text-xs text-foreground/50">{value ?? '—'}</span>
              </div>
            ))}
          </div>
          {settingsEntries.length > 8 && (
            <p className="mt-2 text-center text-xs text-foreground/40">
              +{settingsEntries.length - 8} more settings on the Settings page
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ tenantId }: { tenantId: string }) {
  const [page, setPage] = useState(1)
  const limit = 20

  const usersQ = useQuery<PaginatedResponse<TenantPortalUser>>({
    queryKey: ['platform', 'tenant', tenantId, 'users', page],
    queryFn: async () => {
      const res = await platformApi.tenants.getUsers(tenantId, { page, limit })
      return res.data as PaginatedResponse<TenantPortalUser>
    },
    staleTime: 30_000,
  })

  const users = usersQ.data?.data ?? []
  const total = usersQ.data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-foreground/3">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Role</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {usersQ.isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-border/30">
                  {[32, 48, 16, 16, 24].map((w, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className={`h-3.5 rounded bg-foreground/8`} style={{ width: `${w * 4}px` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Users size={24} className="mx-auto mb-2 text-foreground/25" />
                  <p className="text-sm text-foreground/40">No portal users found</p>
                </td>
              </tr>
            ) : (
              users.map((user, i) => (
                <tr key={user.id} className={`border-b border-border/30 last:border-0 ${i % 2 !== 0 ? 'bg-foreground/2' : ''}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-foreground/60">{user.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.portal_role} /></td>
                  <td className="px-4 py-3"><UserStatusBadge status={user.status} /></td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-foreground/40">
                      {user.last_login_at ? formatRelativeTime(user.last_login_at) : '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > limit && (
          <div className="flex items-center justify-between border-t border-border bg-foreground/3 px-4 py-2.5">
            <span className="font-mono text-xs text-foreground/40">{total} total</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors"
              >
                ← Prev
              </button>
              <span className="font-mono text-xs text-foreground/50 min-w-[50px] text-center">{page}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ tenantId }: { tenantId: string }) {
  const [page, setPage] = useState(1)
  const limit = 25

  const activityQ = useQuery<PaginatedResponse<PlatformActivityLog>>({
    queryKey: ['platform', 'tenant', tenantId, 'activity', page],
    queryFn: async () => {
      const res = await platformApi.tenants.getActivity(tenantId, { page, limit })
      const d = res.data as PaginatedResponse<PlatformActivityLog> | PlatformActivityLog[]
      if (Array.isArray(d)) return { data: d, meta: { page: 1, limit, total: d.length } }
      return d
    },
    staleTime: 30_000,
  })

  const logs = activityQ.data?.data ?? []
  const total = activityQ.data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-foreground/3">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Action</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Actor</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Time</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Details</th>
            </tr>
          </thead>
          <tbody>
            {activityQ.isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-border/30">
                  {[40, 32, 24, 48].map((w, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 rounded bg-foreground/8" style={{ width: `${w * 4}px` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <Activity size={24} className="mx-auto mb-2 text-foreground/25" />
                  <p className="text-sm text-foreground/40">No activity recorded</p>
                </td>
              </tr>
            ) : (
              logs.map((log, i) => {
                const details = log.details
                  ? Object.entries(log.details)
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(', ')
                  : null
                return (
                  <tr key={log.id} className={`border-b border-border/30 last:border-0 ${i % 2 !== 0 ? 'bg-foreground/2' : ''}`}>
                    <td className="px-4 py-3 font-medium text-foreground/70">{actionLabel(log.action)}</td>
                    <td className="px-4 py-3 text-xs text-foreground/50">{log.adminEmail ?? log.adminId ?? 'System'}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground/40" title={formatDateTime(log.createdAt)}>
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-xs text-foreground/40">
                      {log.targetLabel || details || '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {total > limit && (
          <div className="flex items-center justify-between border-t border-border bg-foreground/3 px-4 py-2.5">
            <span className="font-mono text-xs text-foreground/40">{total} total</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors">
                ← Prev
              </button>
              <span className="font-mono text-xs text-foreground/50 min-w-[50px] text-center">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const queryClient = useQueryClient()
  const { hasRole } = usePlatformAuth()
  const canWrite = hasRole('ADMIN')

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [changeStatusOpen, setChangeStatusOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const tenantQ = useQuery<TenantDetail>({
    queryKey: ['platform', 'tenant', id],
    queryFn: async () => {
      const res = await platformApi.tenants.get(id)
      return res.data as TenantDetail
    },
    staleTime: 30_000,
    retry: 1,
  })

  const statsQ = useQuery<TenantStats>({
    queryKey: ['platform', 'tenant', id, 'stats'],
    queryFn: async () => {
      const res = await platformApi.tenants.getStats(id)
      return res.data as TenantStats
    },
    staleTime: 60_000,
  })

  const resetSessionsMut = useMutation({
    mutationFn: () => platformApi.tenants.resetSessions(id),
    onSuccess: () => {
      toast.success('Sessions revoked')
      setResetOpen(false)
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', id, 'stats'] })
    },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const invalidateTenant = () => {
    queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', id] })
    queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
  }

  const tenant = tenantQ.data
  const stats = statsQ.data

  if (tenantQ.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 size={40} className="mb-4 text-foreground/25" />
        <h2 className="font-syne text-lg font-bold text-foreground/70">Tenant not found</h2>
        <p className="mt-1 text-sm text-foreground/40">The tenant you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href="/platform/tenants" className="mt-5 flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors">
          <ArrowLeft size={14} /> Back to Tenants
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-foreground/40">
        <span>Platform</span>
        <ChevronRight size={13} />
        <Link href="/platform/tenants" className="hover:text-[#E85D04] transition-colors">Tenants</Link>
        <ChevronRight size={13} />
        {tenantQ.isLoading ? (
          <div className="h-3.5 w-32 animate-pulse rounded bg-foreground/8" />
        ) : (
          <span className="font-medium text-foreground/70">{tenant?.stationName}</span>
        )}
      </nav>

      {/* Header */}
      {tenantQ.isLoading ? (
        <SkeletonHeader />
      ) : tenant ? (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-syne text-2xl font-bold text-foreground">{tenant.stationName}</h1>
              <TenantStatusBadge status={tenant.status} large />
            </div>
            <p className="mt-1 font-mono text-sm text-foreground/40">{tenant.stationCode}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <>
                <button
                  onClick={() => setChangeStatusOpen(true)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors"
                >
                  Change Status
                </button>
                <button
                  onClick={() => setResetOpen(true)}
                  className="rounded-lg border border-rose-500/25 bg-card px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
                >
                  Reset Sessions
                </button>
              </>
            )}
            <Link
              href={`/platform/tenants/${id}/settings`}
              className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
            >
              <Settings size={14} /> Settings
            </Link>
          </div>
        </div>
      ) : null}

      {/* Info cards */}
      {tenantQ.isLoading ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
              <div className="h-3 w-20 rounded bg-foreground/8" />
              <div className="mt-3 h-4 w-32 rounded bg-foreground/8" />
            </div>
          ))}
        </div>
      ) : tenant ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Owner" value={tenant.ownerName} />
          <InfoCard label="Email" value={tenant.email} />
          <InfoCard label="Phone" value={tenant.contactNumber} />
          <InfoCard label="District" value={tenant.district} />
          <InfoCard label="Created" value={formatDate(tenant.createdAt)} mono />
          <InfoCard label="Last Updated" value={formatDate(tenant.updatedAt)} mono />
        </div>
      ) : null}

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Staff" value={stats?.totalStaff} loading={statsQ.isLoading} />
        <StatCard label="Total Shifts" value={stats?.totalShifts} loading={statsQ.isLoading} />
        <StatCard label="Total Products" value={stats?.totalProducts} loading={statsQ.isLoading} />
        <StatCard label="Active Sessions" value={stats?.activeSessions} loading={statsQ.isLoading} />
        <StatCard
          label="Last Activity"
          value={stats?.lastActivity ? <span className="text-sm font-normal">{formatRelativeTime(stats.lastActivity)}</span> : null}
          loading={statsQ.isLoading}
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-[#E85D04] text-[#E85D04]'
                : 'text-foreground/50 hover:text-foreground/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && tenant && <OverviewTab tenant={tenant} />}
      {activeTab === 'users' && <UsersTab tenantId={id} />}
      {activeTab === 'sessions' && <SessionsTab tenantId={id} canWrite={canWrite} />}
      {activeTab === 'activity' && <ActivityTab tenantId={id} />}
      {activeTab === 'settings' && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Settings size={28} className="mx-auto mb-3 text-foreground/25" />
          <p className="text-sm text-foreground/50">Manage tenant configuration</p>
          <Link
            href={`/platform/tenants/${id}/settings`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
          >
            <Settings size={14} /> Open Settings
          </Link>
        </div>
      )}

      {/* Modals */}
      {tenant && (
        <ChangeStatusModal
          key={changeStatusOpen ? 'open' : 'closed'}
          open={changeStatusOpen}
          currentStatus={tenant.status}
          onClose={() => setChangeStatusOpen(false)}
          onSuccess={invalidateTenant}
          tenantId={id}
        />
      )}

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Tenant Sessions"
        description="This will revoke all active sessions for users in this tenant. They will need to log in again."
        onConfirm={() => resetSessionsMut.mutate()}
        loading={resetSessionsMut.isPending}
        danger
      />
    </div>
  )
}
