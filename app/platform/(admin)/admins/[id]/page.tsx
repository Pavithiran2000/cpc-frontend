'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronRight, ArrowLeft, Shield, Activity, Monitor,
  Laptop, X, LogOut, AlertTriangle,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { formatDate, formatDateTime, formatRelativeTime, actionLabel } from '@/lib/utils'
import type {
  PlatformAdmin, PlatformRole, PlatformAdminStatus,
  AdminSession, PlatformActivityLog, PaginatedResponse,
} from '@/lib/platform-types'

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: PlatformRole }) {
  const cls =
    role === 'SUPER_ADMIN' ? 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400' :
    role === 'ADMIN' ? 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400' :
    'bg-foreground/8 text-foreground/50 border-border'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <Shield size={10} /> {role}
    </span>
  )
}

function StatusBadge({ status }: { status: PlatformAdminStatus }) {
  const cls =
    status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' :
    status === 'SUSPENDED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400' :
    'bg-foreground/8 text-foreground/50 border-border'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'sessions' | 'activity'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: Shield },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
  { id: 'activity', label: 'Activity', icon: Activity },
]

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/40 shrink-0">{label}</span>
      <span className={`text-sm text-foreground text-right ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-foreground/25">—</span>}
      </span>
    </div>
  )
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ admin }: { admin: PlatformAdmin }) {
  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground/40">Identity</h3>
        <div className="divide-y divide-border/30">
          <InfoRow label="Name" value={admin.name} />
          <InfoRow label="Email" value={admin.email} mono />
          <InfoRow label="Role" value={<RoleBadge role={admin.platformRole} />} />
          <InfoRow label="Status" value={<StatusBadge status={admin.status} />} />
          <InfoRow label="2FA Enabled" value={admin.twoFactorEnabled ? '✓ Yes' : '✗ No'} />
          <InfoRow label="MFA Method" value={admin.mfaMethod ?? 'None'} />
        </div>
      </div>

      {/* Timestamps */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground/40">Timestamps</h3>
        <div className="divide-y divide-border/30">
          <InfoRow label="Last Login" value={admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : 'Never'} mono />
          <InfoRow label="Member Since" value={formatDate(admin.createdAt)} mono />
          <InfoRow label="Last Updated" value={formatDate(admin.updatedAt)} mono />
          {admin.invitedByEmail && <InfoRow label="Invited By" value={admin.invitedByName ?? admin.invitedByEmail} />}
        </div>
      </div>
    </div>
  )
}

// ─── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab({ adminId }: { adminId: string }) {
  const queryClient = useQueryClient()

  const sessionsQ = useQuery<AdminSession[]>({
    queryKey: ['platform', 'admin', adminId, 'sessions'],
    queryFn: async () => {
      const res = await platformApi.admins.getSessions(adminId)
      const d = res.data as AdminSession[] | { data?: AdminSession[] }
      return Array.isArray(d) ? d : (d.data ?? [])
    },
    staleTime: 30_000,
  })

  const revokeMut = useMutation({
    mutationFn: (sessionId: string) =>
      platformApi.admins.revokeSession(adminId, sessionId),
    onSuccess: () => {
      toast.success('Session revoked')
      queryClient.invalidateQueries({ queryKey: ['platform', 'admin', adminId, 'sessions'] })
    },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const revokeAllMut = useMutation({
    mutationFn: () => platformApi.admins.revokeSessions(adminId),
    onSuccess: () => {
      toast.success('All sessions revoked')
      queryClient.invalidateQueries({ queryKey: ['platform', 'admin', adminId, 'sessions'] })
    },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const sessions = sessionsQ.data ?? []

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-foreground/50">
          {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
        </p>
        {sessions.length > 1 && (
          <button
            onClick={() => revokeAllMut.mutate()}
            disabled={revokeAllMut.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/25 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
          >
            <LogOut size={13} /> Revoke All
          </button>
        )}
      </div>

      {sessionsQ.isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border bg-card">
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
                  <p className="text-sm font-medium text-foreground truncate">{browser}</p>
                  <p className="text-xs text-foreground/40">
                    {session.ipAddress ?? 'Unknown IP'}
                    {session.lastActiveAt && <> · Last active {formatRelativeTime(session.lastActiveAt)}</>}
                    {session.createdAt && <> · Created {formatDate(session.createdAt)}</>}
                  </p>
                </div>
                <button
                  onClick={() => revokeMut.mutate(session.id)}
                  disabled={revokeMut.isPending}
                  title="Revoke session"
                  className="shrink-0 rounded p-1.5 text-foreground/40 hover:bg-rose-500/10 hover:text-rose-600 transition-colors disabled:opacity-40"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ adminId }: { adminId: string }) {
  const [page, setPage] = useState(1)
  const limit = 25

  const activityQ = useQuery<PaginatedResponse<PlatformActivityLog>>({
    queryKey: ['platform', 'admin', adminId, 'activity', page],
    queryFn: async () => {
      const res = await platformApi.admins.getActivity(adminId, { page, limit })
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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-foreground/3">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Action</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Target</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Time</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">IP</th>
          </tr>
        </thead>
        <tbody>
          {activityQ.isLoading ? (
            [...Array(6)].map((_, i) => (
              <tr key={i} className="animate-pulse border-b border-border/30">
                {[40, 32, 24, 20].map((w, j) => (
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
            logs.map((log, i) => (
              <tr key={log.id} className={`border-b border-border/30 last:border-0 ${i % 2 !== 0 ? 'bg-foreground/2' : ''}`}>
                <td className="px-4 py-3 font-medium text-foreground">{actionLabel(log.action)}</td>
                <td className="px-4 py-3 text-xs text-foreground/50">{log.targetLabel ?? log.targetType ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-foreground/40" title={formatDateTime(log.createdAt)}>
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-foreground/40">{log.ipAddress ?? '—'}</span>
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
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/70 disabled:opacity-30 transition-colors">
              ← Prev
            </button>
            <span className="font-mono text-xs text-foreground/50 min-w-[50px] text-center">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/70 disabled:opacity-30 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { hasRole } = usePlatformAuth()
  const canView = hasRole('SUPER_ADMIN')
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  const adminQ = useQuery<PlatformAdmin>({
    queryKey: ['platform', 'admin', id],
    queryFn: async () => {
      const res = await platformApi.admins.get(id)
      return res.data as PlatformAdmin
    },
    staleTime: 30_000,
    enabled: canView,
  })

  const admin = adminQ.data

  if (adminQ.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={40} className="mb-4 text-foreground/25" />
        <h2 className="font-syne text-lg font-bold text-foreground/70">Admin not found</h2>
        <p className="mt-1 text-sm text-foreground/40">This admin account may have been removed.</p>
        <Link href="/platform/admins"
          className="mt-5 flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors">
          <ArrowLeft size={14} /> Back to Admins
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
        <Link href="/platform/admins" className="hover:text-[#E85D04] transition-colors">Admins</Link>
        <ChevronRight size={13} />
        {adminQ.isLoading ? (
          <div className="h-3.5 w-28 animate-pulse rounded bg-foreground/8" />
        ) : (
          <span className="font-medium text-foreground/70">{admin?.name}</span>
        )}
      </nav>

      {/* Header */}
      {adminQ.isLoading ? (
        <div className="mb-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-foreground/8" />
            <div className="space-y-2">
              <div className="h-6 w-48 rounded bg-foreground/8" />
              <div className="h-4 w-32 rounded bg-foreground/6" />
            </div>
          </div>
        </div>
      ) : admin ? (
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E85D04]/15 font-syne text-lg font-bold text-[#E85D04]">
            {admin.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-syne text-2xl font-bold text-foreground">{admin.name}</h1>
              <StatusBadge status={admin.status} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-foreground/50">{admin.email}</p>
              <RoleBadge role={admin.platformRole} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#E85D04] text-[#E85D04]'
                  : 'text-foreground/50 hover:text-foreground/70'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && admin && <ProfileTab admin={admin} />}
      {activeTab === 'sessions' && <SessionsTab adminId={id} />}
      {activeTab === 'activity' && <ActivityTab adminId={id} />}
    </div>
  )
}
