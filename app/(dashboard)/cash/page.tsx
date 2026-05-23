'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { cashApi } from '@/lib/api/cash'
import { shiftsApi } from '@/lib/api/shifts'
import type { DailyCashBalance, CashSummary, ShiftSession } from '@/lib/types'
import { formatDate, formatDateTime, formatCurrency, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Shift Cash Summary', 'Daily Balancing'] as const
type Tab = (typeof TABS)[number]

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1 w-fit">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
            active === t
              ? 'bg-[#E85D04] text-white'
              : 'text-white/40 hover:text-white/70',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: string
  variant?: 'default' | 'green' | 'red'
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/8 bg-[#18181C] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
        {label}
      </p>
      <p
        className={cn(
          'number text-xl font-semibold',
          variant === 'green' && 'text-emerald-400',
          variant === 'red' && 'text-rose-400',
          variant === 'default' && 'text-white',
        )}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Shift Cash Summary Tab ───────────────────────────────────────────────────

function ShiftCashSummaryTab() {
  const [selectedSessionId, setSelectedSessionId] = useState('')

  const sessionsQuery = useQuery({
    queryKey: ['shift-sessions-cash', { limit: 50 }],
    queryFn: () => shiftsApi.listSessions({ limit: 50 }).then((r) => r.data),
  })
  const sessions: ShiftSession[] = sessionsQuery.data?.data ?? []

  const summaryQuery = useQuery({
    queryKey: ['cash-shift-summary', selectedSessionId],
    queryFn: () => cashApi.shiftSummary(selectedSessionId).then((r) => r.data as CashSummary),
    enabled: !!selectedSessionId,
  })
  const summary = summaryQuery.data

  const net = summary ? (summary.total_collected ?? 0) - (summary.total_expected ?? 0) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Session selector */}
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
          Shift Session
        </label>
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50 cursor-pointer"
        >
          <option value="" className="bg-[#18181C]">Select a session…</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#18181C]">
              {formatDate(s.business_date)} — {s.shift_template?.shift_name ?? s.shift_template_id} ({s.status})
            </option>
          ))}
        </select>
      </div>

      {!selectedSessionId && (
        <p className="text-sm text-white/30 text-center py-8">
          Select a shift session to view cash summary
        </p>
      )}

      {selectedSessionId && summaryQuery.isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#E85D04]" />
        </div>
      )}

      {summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Expected Total"
              value={formatCurrency(summary.total_expected)}
            />
            <StatCard
              label="Actual Total"
              value={formatCurrency(summary.total_collected)}
            />
            <StatCard
              label="Net"
              value={formatCurrency(Math.abs(net))}
              variant={net >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Per-pumper table */}
          {(summary.submissions ?? []).length > 0 && (
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.02]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      Pumper
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      Expected
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      Actual
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      Difference
                    </th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(summary.submissions ?? []).map((sub) => {
                    const diff = (sub.actual_cash ?? 0) - (sub.expected_cash ?? 0)
                    const isShortfall = diff < 0
                    return (
                      <tr key={sub.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-white">
                          {sub.pumper_id}
                        </td>
                        <td className="px-4 py-3 number text-right text-white/60">
                          {formatCurrency(sub.expected_cash)}
                        </td>
                        <td className="px-4 py-3 number text-right text-white/80">
                          {formatCurrency(sub.actual_cash)}
                        </td>
                        <td className="px-4 py-3 number text-right">
                          <span
                            className={cn(
                              'font-semibold',
                              isShortfall ? 'text-rose-400' : 'text-emerald-400',
                            )}
                          >
                            {diff >= 0 ? '+' : ''}
                            {formatCurrency(Math.abs(diff))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isShortfall && (
                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                              Shortfall
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(summary.submissions ?? []).length === 0 && (
            <p className="text-sm text-white/30 text-center py-4">
              No cash submissions for this session
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─── Daily Balancing Tab ──────────────────────────────────────────────────────

function DailyBalancingTab() {
  const queryClient = useQueryClient()
  const { page, limit, setPage, setLimit } = usePagination()
  const [closeTarget, setCloseTarget] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const query = useQuery({
    queryKey: ['daily-balancing', { page, limit }],
    queryFn: () => cashApi.listDailyBalances({ page, limit }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      cashApi.createDailyBalance({
        business_date: new Date().toISOString().slice(0, 10),
        expected_cash: 0,
        actual_cash:   0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-balancing'] })
      setCreating(false)
      toast.success('Daily balance created')
    },
    onError: () => toast.error('Failed to create daily balance'),
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => cashApi.closeDailyBalance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-balancing'] })
      setCloseTarget(null)
      toast.success('Daily balance closed')
    },
    onError: () => toast.error('Failed to close daily balance'),
  })

  const columns = useMemo<ColumnDef<DailyCashBalance>[]>(
    () => [
      {
        id: 'business_date',
        header: 'Business Date',
        cell: ({ row }) => (
          <span className="number text-sm font-medium text-white">
            {formatDate(row.original.business_date)}
          </span>
        ),
      },
      {
        id: 'total_revenue',
        header: 'Total Cash',
        cell: ({ row }) => (
          <span className="number text-sm text-white/70">
            {row.original.total_revenue != null
              ? formatCurrency(row.original.total_revenue)
              : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'closed_at',
        header: 'Closed At',
        cell: ({ row }) => (
          <span className="number text-xs text-white/40">
            {row.original.status === 'CLOSED' ? formatDate(row.original.business_date) : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            {row.original.status !== 'CLOSED' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCloseTarget(row.original.id)
                }}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:border-white/20 hover:text-white/80 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          disabled={createMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
        >
          + Create Balance
        </button>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        total={query.data?.meta.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={query.isLoading}
        emptyMessage="No daily balances found"
      />

      {/* Create confirmation */}
      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setCreating(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#18181C] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 font-syne text-base font-semibold text-white">
              Create Daily Balance
            </h3>
            <p className="mb-5 text-sm text-white/50">
              This will create a daily balance for today ({new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}), summing all shift cash for the day.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCreating(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex-1 rounded-lg bg-[#E85D04] py-2 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!closeTarget}
        onOpenChange={(v) => !v && setCloseTarget(null)}
        title="Close Daily Balance?"
        description="All shift sessions for this date must be closed. This action cannot be undone."
        confirmLabel="Close Balance"
        variant="danger"
        onConfirm={() => closeTarget && closeMutation.mutate(closeTarget)}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CashPage() {
  const [tab, setTab] = useState<Tab>('Shift Cash Summary')

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Cash Management"
        description="Shift cash summaries and daily balancing"
      />
      <TabBar active={tab} onChange={setTab} />
      {tab === 'Shift Cash Summary' && <ShiftCashSummaryTab />}
      {tab === 'Daily Balancing' && <DailyBalancingTab />}
    </div>
  )
}
