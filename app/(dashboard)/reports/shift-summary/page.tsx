'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'

import { reportsApi } from '@/lib/api/reports'
import type { ShiftSummaryRow } from '@/lib/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

// ─── Date range helpers ───────────────────────────────────────────────────────

function defaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftSummaryReportPage() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10))

  const filters = useMemo(
    () => ({ page, limit, date_from: dateFrom, date_to: dateTo }),
    [page, limit, dateFrom, dateTo],
  )

  const query = useQuery({
    queryKey: ['report-shift-summary', filters],
    queryFn:  () => reportsApi.shiftSummary(filters).then((r) => r.data),
  })

  const columns = useMemo<ColumnDef<ShiftSummaryRow>[]>(() => [
    {
      id: 'business_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="number text-sm font-medium text-foreground">{formatDate(row.original.business_date)}</span>
      ),
    },
    {
      id: 'shift_name',
      header: 'Shift',
      cell: ({ row }) => <span className="text-sm text-foreground/80">{row.original.shift_name}</span>,
    },
    {
      id: 'expected_cash',
      header: 'Expected Cash',
      cell: ({ row }) => (
        <span className="number text-sm font-semibold text-foreground/90">{formatCurrency(row.original.expected_cash)}</span>
      ),
    },
    {
      id: 'actual_cash',
      header: 'Actual Cash',
      cell: ({ row }) => (
        <span className="number text-sm text-foreground/70">{formatCurrency(row.original.actual_cash)}</span>
      ),
    },
    {
      id: 'shortfall',
      header: 'Shortfall',
      cell: ({ row }) => (
        <span className={`number text-xs ${row.original.shortfall > 0 ? 'text-rose-400' : 'text-foreground/40'}`}>
          {row.original.shortfall > 0 ? formatCurrency(row.original.shortfall) : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-xs text-foreground/60">{row.original.status}</span>
      ),
    },
  ], [])

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Shift Summary Report"
        description="Revenue and fuel dispensed per shift"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground/60 hover:text-foreground/80"
          >
            <Printer size={14} /> Print
          </button>
        }
      />

      {/* Date filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">From</label>
          <input type="date" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground/70 outline-none focus:border-[#E85D04]/60" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">To</label>
          <input type="date" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground/70 outline-none focus:border-[#E85D04]/60" />
        </div>
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
        emptyMessage="No shift data in the selected date range"
      />
    </div>
  )
}
