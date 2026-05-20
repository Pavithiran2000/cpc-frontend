'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'

import { reportsApi } from '@/lib/api/reports'
import { formatDate, formatCurrency } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

function defaultFrom() {
  const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10)
}

interface ShortfallRow {
  staff_id: string
  staff_name?: string
  employee_no?: string
  shift_date?: string
  shift_name?: string
  expected_cash?: number
  actual_cash?: number
  shortfall: number
}

export default function PumperShortfallsPage() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10))

  const filters = useMemo(() => ({ page, limit, date_from: dateFrom, date_to: dateTo }), [page, limit, dateFrom, dateTo])

  const query = useQuery({
    queryKey: ['report-pumper-shortfalls', filters],
    queryFn:  () => reportsApi.pumperShortfalls(filters).then((r) => r.data as { data: ShortfallRow[]; meta: { total: number } }),
  })

  const columns = useMemo<ColumnDef<ShortfallRow>[]>(() => [
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => <span className="number text-xs text-white/60">{formatDate(row.original.shift_date)}</span>,
    },
    {
      id: 'staff',
      header: 'Pumper',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-white">{row.original.staff_name ?? row.original.staff_id}</p>
          {row.original.employee_no && <p className="number text-[10px] text-white/40">{row.original.employee_no}</p>}
        </div>
      ),
    },
    {
      id: 'shift_name',
      header: 'Shift',
      cell: ({ row }) => <span className="text-xs text-white/60">{row.original.shift_name ?? '—'}</span>,
    },
    {
      id: 'expected',
      header: 'Expected',
      cell: ({ row }) => <span className="number text-xs text-white/60">{formatCurrency(row.original.expected_cash)}</span>,
    },
    {
      id: 'actual',
      header: 'Actual',
      cell: ({ row }) => <span className="number text-xs text-white/60">{formatCurrency(row.original.actual_cash)}</span>,
    },
    {
      id: 'shortfall',
      header: 'Shortfall',
      cell: ({ row }) => (
        <span className="number text-sm font-semibold text-rose-400">{formatCurrency(row.original.shortfall)}</span>
      ),
    },
  ], [])

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Pumper Shortfalls"
        description="Cash shortfall records per pumper"
        actions={
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white/80">
            <Printer size={14} /> Print
          </button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-white/35">From</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 outline-none focus:border-[#E85D04]/60" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-white/35">To</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 outline-none focus:border-[#E85D04]/60" />
        </div>
      </div>
      <DataTable columns={columns} data={query.data?.data ?? []} total={query.data?.meta.total ?? 0}
        page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit}
        isLoading={query.isLoading} emptyMessage="No shortfalls in the selected date range" />
    </div>
  )
}
