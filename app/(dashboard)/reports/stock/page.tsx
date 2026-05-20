'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'

import { reportsApi } from '@/lib/api/reports'
import type { StockReportRow } from '@/lib/types'
import { formatLitres, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

function defaultFrom() {
  const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10)
}

export default function StockReportPage() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10))

  const filters = useMemo(() => ({ page, limit, date_from: dateFrom, date_to: dateTo }), [page, limit, dateFrom, dateTo])

  const query = useQuery({
    queryKey: ['report-stock', filters],
    queryFn:  () => reportsApi.stock(filters).then((r) => r.data),
  })

  const columns = useMemo<ColumnDef<StockReportRow>[]>(() => [
    {
      id: 'product_name',
      header: 'Product',
      cell: ({ row }) => <span className="font-medium text-white">{row.original.product_name}</span>,
    },
    {
      id: 'opening_stock',
      header: 'Opening',
      cell: ({ row }) => <span className="number text-xs text-white/70">{formatLitres(row.original.opening_stock)}</span>,
    },
    {
      id: 'received',
      header: 'Received',
      cell: ({ row }) => <span className="number text-xs text-emerald-400">+{formatLitres(row.original.received)}</span>,
    },
    {
      id: 'dispensed',
      header: 'Dispensed',
      cell: ({ row }) => <span className="number text-xs text-rose-400">-{formatLitres(row.original.dispensed)}</span>,
    },
    {
      id: 'closing_stock',
      header: 'Closing',
      cell: ({ row }) => <span className="number text-sm font-semibold text-white">{formatLitres(row.original.closing_stock)}</span>,
    },
    {
      id: 'variance',
      header: 'Variance',
      cell: ({ row }) => {
        const v = row.original.variance
        return (
          <span className={cn('number text-xs font-semibold', v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-white/40')}>
            {v > 0 ? '+' : ''}{formatLitres(v)}
          </span>
        )
      },
    },
  ], [])

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Stock Report"
        description="Opening, received, dispensed, closing stock and variances"
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
      <DataTable
        columns={columns} data={query.data?.data ?? []} total={query.data?.meta.total ?? 0}
        page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit}
        isLoading={query.isLoading} emptyMessage="No stock data in the selected date range" />
    </div>
  )
}
