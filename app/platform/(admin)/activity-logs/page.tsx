'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, ChevronLeft, ChevronRight, ChevronDown, Activity, ArrowUpDown } from 'lucide-react'
import { platformApi } from '@/lib/platform-api'
import { actionLabel, formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { PlatformActivityLog } from '@/lib/platform-types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_TYPES = [
  'TENANT_CREATED', 'TENANT_UPDATED', 'TENANT_STATUS_CHANGED', 'TENANT_SETTINGS_UPDATED', 'TENANT_SESSIONS_RESET',
  'ADMIN_INVITED', 'ADMIN_UPDATED', 'ADMIN_STATUS_CHANGED', 'ADMIN_ROLE_CHANGED',
  'ADMIN_SESSIONS_REVOKED', 'ADMIN_PASSWORD_RESET', 'ADMIN_DELETED',
  'PASSWORD_RESET', 'PASSWORD_CHANGED', 'PROFILE_UPDATED',
  'MFA_TOTP_ENABLED', 'MFA_DISABLED',
  'PLATFORM_LOGIN', 'PLATFORM_LOGOUT', 'LOGIN_MFA_VERIFIED',
]

const TARGET_TYPES = ['TENANT', 'ADMIN', 'SELF', 'SYSTEM']

const LIMIT = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(email: string | null): string {
  if (!email) return '?'
  const parts = email.split('@')[0].split(/[._-]/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || email[0]?.toUpperCase() || '?'
}

function actionColor(action: string): string {
  if (action.includes('CREATED') || action.includes('INVITED') || action.includes('ENABLED')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (action.includes('DELETED') || action.includes('DISABLED') || action.includes('STATUS_CHANGED')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
  if (action.includes('RESET') || action.includes('REVOKED')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  return 'bg-foreground/8 text-foreground/60'
}

function exportCsv(logs: PlatformActivityLog[]) {
  const headers = ['ID', 'Action', 'Admin Email', 'Target Type', 'Target Label', 'IP Address', 'Timestamp']
  const rows = logs.map((l) => [
    l.id,
    l.action,
    l.adminEmail,
    l.targetType ?? '',
    l.targetLabel ?? '',
    l.ipAddress ?? '',
    l.createdAt,
  ])
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: PlatformActivityLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = log.details && Object.keys(log.details).length > 0

  return (
    <>
      <tr
        className={`border-b border-border/50 transition-colors ${hasDetails ? 'cursor-pointer hover:bg-foreground/3' : 'hover:bg-foreground/2'}`}
        onClick={() => hasDetails && setExpanded((p) => !p)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E85D04]/10 text-[10px] font-bold text-[#E85D04]">
              {initials(log.adminEmail)}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/80">{log.adminEmail ?? '—'}</p>
              {log.targetLabel && (
                <p className="text-xs text-foreground/40">
                  {log.targetType && <span className="font-mono">[{log.targetType}]</span>} {log.targetLabel}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${actionColor(log.action)}`}>
            {actionLabel(log.action)}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-foreground/40">{log.ipAddress ?? '—'}</td>
        <td className="px-4 py-3 text-right">
          <span className="text-xs text-foreground/40" title={formatDateTime(log.createdAt)}>
            {formatRelativeTime(log.createdAt)}
          </span>
          {hasDetails && (
            <span className="ml-2 text-foreground/25">
              {expanded ? <ChevronDown size={12} className="inline" /> : <ChevronRight size={12} className="inline" />}
            </span>
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="border-b border-border/50 bg-foreground/3">
          <td colSpan={4} className="px-4 py-3">
            <pre className="overflow-x-auto rounded-lg border border-border bg-card p-3 text-xs text-foreground/60">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityLogsPage() {
  const searchParams = useSearchParams()
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tenantId = searchParams.get('tenant_id') ?? ''

  const handleSearch = useCallback((v: string) => {
    setSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 400)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const params: Record<string, unknown> = { page, limit: LIMIT, sort_order: sortOrder }
  if (debouncedSearch) params.admin_email = debouncedSearch
  if (action) params.action = action
  if (targetType) params.target_type = targetType
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  if (tenantId) params.tenant_id = tenantId

  const logsQ = useQuery<{ data: PlatformActivityLog[]; meta: { page: number; limit: number; total: number } }>({
    queryKey: ['platform', 'activity-logs', params],
    queryFn: async () => {
      const res = await platformApi.activityLogs.list(params)
      return res.data
    },
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })

  const logs = logsQ.data?.data ?? []
  const meta = logsQ.data?.meta
  const totalPages = meta ? Math.ceil(meta.total / LIMIT) : 1

  const resetFilters = () => {
    setSearch(''); setDebouncedSearch(''); setAction(''); setTargetType('')
    setDateFrom(''); setDateTo(''); setPage(1)
  }

  const hasFilters = debouncedSearch || action || targetType || dateFrom || dateTo

  const inputCls = 'rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-[#E85D04]/50 focus:outline-none'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Activity Logs</h1>
          <p className="mt-1 text-sm text-foreground/50">Platform administration audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder((o) => (o === 'DESC' ? 'ASC' : 'DESC'))}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
            title={`Sort ${sortOrder === 'DESC' ? 'oldest first' : 'newest first'}`}
          >
            <ArrowUpDown size={14} /> {sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}
          </button>
          <button
            onClick={() => logs.length > 0 && exportCsv(logs)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors disabled:opacity-40"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by admin email…"
              className={`${inputCls} w-full pl-8`}
            />
          </div>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className={inputCls}>
            <option value="">All Actions</option>
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>{actionLabel(a)}</option>
            ))}
          </select>
          <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1) }} className={inputCls}>
            <option value="">All Targets</option>
            {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className={inputCls}
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className={inputCls}
            title="To date"
          />
          {tenantId && (
            <span className="flex items-center gap-1.5 rounded-lg border border-[#E85D04]/30 bg-[#E85D04]/8 px-2.5 py-1.5 text-xs font-medium text-[#E85D04]">
              Tenant filter active
            </span>
          )}
          {hasFilters && (
            <button onClick={resetFilters} className="text-sm text-foreground/40 hover:text-foreground/70 transition-colors px-2">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {logsQ.isLoading ? (
          <div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0">
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-foreground/8" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 animate-pulse rounded bg-foreground/8" />
                  <div className="h-3 w-32 animate-pulse rounded bg-foreground/8" />
                </div>
                <div className="h-5 w-28 animate-pulse rounded-md bg-foreground/8" />
                <div className="h-3 w-20 animate-pulse rounded bg-foreground/8" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Activity size={28} className="mx-auto mb-3 text-foreground/20" />
            <p className="text-sm text-foreground/50">
              {hasFilters ? 'No logs match these filters' : 'No activity logs yet'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/3">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Admin / Target</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Action</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground/40">IP Address</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.total > LIMIT && (
        <div className="mt-4 flex items-center justify-between text-sm text-foreground/50">
          <span>
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} of {meta.total.toLocaleString()} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1.5 hover:bg-foreground/8 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 font-medium text-foreground/70">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded p-1.5 hover:bg-foreground/8 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
