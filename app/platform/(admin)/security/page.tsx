'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, X, Search, Shield, ArrowUpDown,
} from 'lucide-react'
import { platformApi } from '@/lib/platform-api'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { PlatformActivityLog, PaginatedResponse } from '@/lib/platform-types'

// ─── Security actions that map to activity log action types ───────────────────
// Backend stores LOGIN_FAILED (not FAILED_LOGIN)

const SECURITY_ACTIONS = [
  'LOGIN_FAILED',
  'MFA_FAILED',
  'ACCOUNT_LOCKED',
  'SUSPICIOUS_IP',
  'SESSION_REVOKED',
  'PASSWORD_RESET',
] as const

type SecurityFilter = typeof SECURITY_ACTIONS[number] | 'ALL'

const FILTER_TABS: { value: SecurityFilter; label: string }[] = [
  { value: 'ALL', label: 'All Events' },
  { value: 'LOGIN_FAILED', label: 'Failed Logins' },
  { value: 'MFA_FAILED', label: 'MFA Failed' },
  { value: 'ACCOUNT_LOCKED', label: 'Account Locked' },
  { value: 'SUSPICIOUS_IP', label: 'Suspicious IP' },
  { value: 'SESSION_REVOKED', label: 'Session Revoked' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
]

const LIMIT = 30

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityEventsPage() {
  const [filter, setFilter] = useState<SecurityFilter>('ALL')
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDebSearch(search); setPage(1) }, 400)
    return () => { if (debRef.current) clearTimeout(debRef.current) }
  }, [search])

  const params: Record<string, unknown> = { page, limit: LIMIT, sort_order: sortOrder }
  if (filter !== 'ALL') params.action = filter
  else params.action = SECURITY_ACTIONS.join(',')
  if (debSearch) params.admin_email = debSearch

  const logsQ = useQuery<PaginatedResponse<PlatformActivityLog>>({
    queryKey: ['platform', 'security', 'logs', params],
    queryFn: async () => {
      const res = await platformApi.activityLogs.list(params)
      return res.data as PaginatedResponse<PlatformActivityLog>
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const logs = logsQ.data?.data ?? []
  const total = logsQ.data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Security Events</h1>
          <p className="mt-0.5 text-sm text-foreground/50">Login failures, MFA issues, and suspicious activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder((o) => (o === 'DESC' ? 'ASC' : 'DESC'))}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5"
          >
            <ArrowUpDown size={12} /> {sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}
          </button>
          <button
            onClick={() => logsQ.refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-0.5 w-fit">
        {FILTER_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setFilter(value); setPage(1) }}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === value ? 'bg-[#E85D04] text-white' : 'text-foreground/50 hover:text-foreground/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by admin email…"
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
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Event Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Admin Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Target</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">IP Address</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Time</th>
              </tr>
            </thead>
            <tbody>
              {logsQ.isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-border/50">
                    {[28, 48, 32, 24, 20].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded bg-foreground/8" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logsQ.isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <AlertTriangle size={24} className="mx-auto mb-2 text-rose-400" />
                    <p className="text-sm text-foreground/50">Failed to load security events</p>
                    <button
                      onClick={() => logsQ.refetch()}
                      className="mt-3 text-xs text-[#E85D04] hover:underline"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <Shield size={24} className="mx-auto mb-2 text-foreground/20" />
                    <p className="text-sm text-foreground/50">No security events found</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id} className={`border-b border-border/50 last:border-0 hover:bg-foreground/2 transition-colors ${i % 2 !== 0 ? 'bg-foreground/2' : ''}`}>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/70">{log.adminEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-foreground/50">
                      {log.targetLabel
                        ? <><span className="font-mono text-foreground/35">[{log.targetType}]</span> {log.targetLabel}</>
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground/50">{log.ipAddress ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground/40" title={formatDateTime(log.createdAt)}>
                        {formatRelativeTime(log.createdAt)}
                      </span>
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
            {total === 0 ? '0 events' : `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`}
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
    </div>
  )
}
