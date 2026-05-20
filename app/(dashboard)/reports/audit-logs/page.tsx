'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { auditApi } from '@/lib/api/audit'
import { useAuth } from '@/lib/hooks/useAuth'
import type { AuditLog } from '@/lib/types'
import { formatDateTime, cn } from '@/lib/utils'

import { PageHeader } from '@/components/shared/PageHeader'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Activity Logs', 'Entity Change Logs'] as const
type Tab = (typeof TABS)[number]

// ─── Action badge ─────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-400',
  UPDATE: 'bg-blue-500/15 text-blue-400',
  DELETE: 'bg-rose-500/15 text-rose-400',
  LOGIN:  'bg-amber-500/15 text-amber-400',
  LOGOUT: 'bg-white/10 text-white/40',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-white/10 text-white/40'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {action}
    </span>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

// ─── Activity Logs Tab ────────────────────────────────────────────────────────

function ActivityLogsTab() {
  const [offset, setOffset]         = useState(0)
  const [entityType, setEntityType] = useState('')
  const [action, setAction]         = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())

  const params = useMemo(
    () => ({
      entity_type: entityType || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [entityType, offset],
  )

  const query = useQuery({
    queryKey: ['audit-entity-change-logs', params],
    queryFn:  () => auditApi.entityChangeLogs(params).then((r) => r.data),
  })

  const rows: AuditLog[] = useMemo(() => {
    let data = query.data?.data ?? []
    if (action)   data = data.filter((r) => r.action === action)
    if (dateFrom) data = data.filter((r) => r.created_at >= dateFrom)
    if (dateTo)   data = data.filter((r) => r.created_at <= dateTo + 'T23:59:59')
    return data
  }, [query.data, action, dateFrom, dateTo])

  const total = query.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setOffset(0) }}
          placeholder="Entity type…"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#E85D04]/50 w-36"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50 cursor-pointer"
        >
          <option value="" className="bg-[#18181C]">All Actions</option>
          {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'].map((a) => (
            <option key={a} value={a} className="bg-[#18181C]">{a}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50"
        />
        <span className="text-white/30 text-xs">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02]">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Timestamp</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Actor</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Action</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Entity Type</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Entity ID</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-white/25">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-white/25">
                  No activity logs found
                </td>
              </tr>
            ) : (
              rows.flatMap((log) => {
                const isExpanded = expanded.has(log.id)
                const changedFields = log.changed_fields ?? {}
                const fieldCount = Object.keys(changedFields).length

                return [
                  <tr
                    key={log.id}
                    className="hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => fieldCount > 0 && toggleExpand(log.id)}
                  >
                    <td className="number px-4 py-2.5 text-xs text-white/50">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-white/70">
                      {log.actor_name ?? log.actor_user_id}
                    </td>
                    <td className="px-4 py-2.5">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-white/60">
                      {log.entity_type}
                    </td>
                    <td className="number px-4 py-2.5 text-[10px] text-white/30 max-w-[120px] truncate">
                      {log.entity_id}
                    </td>
                    <td className="px-4 py-2.5">
                      {fieldCount > 0 ? (
                        <button className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70">
                          {fieldCount} field{fieldCount > 1 ? 's' : ''}
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                      ) : (
                        <span className="text-[10px] text-white/20">—</span>
                      )}
                    </td>
                  </tr>,
                  ...(isExpanded && fieldCount > 0
                    ? [
                        <tr key={`${log.id}-exp`} className="bg-white/[0.015]">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="rounded-lg border border-white/8 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-white/8 bg-white/[0.03]">
                                    <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-widest text-white/25">Field</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-widest text-white/25">Before</th>
                                    <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-widest text-white/25">After</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {Object.entries(changedFields).map(([field, diff]) => (
                                    <tr key={field}>
                                      <td className="px-3 py-1.5 font-medium text-white/60">{field}</td>
                                      <td className="number px-3 py-1.5 text-rose-400/80">
                                        {diff.from != null ? String(diff.from) : '—'}
                                      </td>
                                      <td className="number px-3 py-1.5 text-emerald-400/80">
                                        {diff.to != null ? String(diff.to) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>,
                      ]
                    : []),
                ]
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Page {currentPage} of {totalPages} ({total} records)</span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Entity Change Logs Tab ───────────────────────────────────────────────────

function EntityChangeLogsTab() {
  const [offset, setOffset]         = useState(0)
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId]     = useState('')

  const params = useMemo(
    () => ({
      entity_type: entityType || undefined,
      entity_id:   entityId   || undefined,
      limit:       PAGE_SIZE,
      offset,
    }),
    [entityType, entityId, offset],
  )

  const query = useQuery({
    queryKey: ['audit-entity-change-logs-v2', params],
    queryFn:  () => auditApi.entityChangeLogs(params).then((r) => r.data),
  })

  // Explode each log into per-field rows
  const rows = useMemo(() => {
    const result: Array<{
      key: string
      log: AuditLog
      field: string
      from: unknown
      to: unknown
    }> = []
    for (const log of query.data?.data ?? []) {
      const fields = log.changed_fields ?? {}
      if (Object.keys(fields).length === 0) {
        result.push({ key: log.id, log, field: '—', from: null, to: null })
      } else {
        Object.entries(fields).forEach(([field, diff], i) => {
          result.push({ key: `${log.id}-${i}`, log, field, from: diff.from, to: diff.to })
        })
      }
    }
    return result
  }, [query.data])

  const total = query.data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setOffset(0) }}
          placeholder="Entity type (e.g. Staff)"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#E85D04]/50 w-44"
        />
        <input
          type="text"
          value={entityId}
          onChange={(e) => { setEntityId(e.target.value); setOffset(0) }}
          placeholder="Entity ID (UUID)"
          className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-[#E85D04]/50 w-64"
        />
        {(entityType || entityId) && (
          <button
            onClick={() => { setEntityType(''); setEntityId(''); setOffset(0) }}
            className="text-xs text-white/30 hover:text-white/60"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02]">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Timestamp</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Entity Type</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Entity ID</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Field</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">Old Value</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">New Value</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {query.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-white/25">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-white/25">
                  No entity change logs found
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="hover:bg-white/[0.02]">
                  <td className="number px-4 py-2.5 text-xs text-white/50">
                    {formatDateTime(r.log.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-white/70">
                    {r.log.entity_type}
                  </td>
                  <td className="number px-4 py-2.5 text-[10px] text-white/30 max-w-[100px] truncate">
                    {r.log.entity_id}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-white/60">{r.field}</td>
                  <td className="number px-4 py-2.5 text-xs text-rose-400/80">
                    {r.from != null ? String(r.from) : '—'}
                  </td>
                  <td className="number px-4 py-2.5 text-xs text-emerald-400/80">
                    {r.to != null ? String(r.to) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-white/40">
                    {r.log.actor_name ?? r.log.actor_user_id}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Page {currentPage} of {totalPages} ({total} records)</span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('Activity Logs')

  useEffect(() => {
    if (!authLoading && user?.portal_role !== 'ADMIN') {
      router.replace('/')
    }
  }, [authLoading, user, router])

  if (authLoading) return null

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Audit Logs"
        description="System-wide activity and entity change history — Admin only"
      />

      <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t ? 'bg-[#E85D04] text-white' : 'text-white/40 hover:text-white/70',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Activity Logs' && <ActivityLogsTab />}
      {tab === 'Entity Change Logs' && <EntityChangeLogsTab />}
    </div>
  )
}
