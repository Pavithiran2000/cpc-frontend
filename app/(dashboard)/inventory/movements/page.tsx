'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'

import { inventoryApi } from '@/lib/api/inventory'
import type { StockMovement } from '@/lib/types'
import { formatLitres, formatDate, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

// ─── Query key ────────────────────────────────────────────────────────────────

const MOVEMENTS_KEY = (f: object) => ['stock-movements', f]

// ─── Movement type badge ──────────────────────────────────────────────────────

function MovementTypeBadge({ type }: { type: string }) {
  const t = type.toUpperCase()
  const isIn =
    t.includes('RECEIPT') || t.includes('STOCK_IN') || t.includes('ADJUSTMENT_IN') ||
    t.includes('INITIAL') || t.includes('RETURN')
  const isOut =
    t.includes('SALE') || t.includes('DISPENSED') || t.includes('ADJUSTMENT_OUT') ||
    t.includes('TRANSFER_OUT')

  const cls = isIn
    ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20'
    : isOut
    ? 'text-rose-400 bg-rose-500/8 border-rose-500/20'
    : 'text-foreground/50 bg-muted/50 border-border'

  const Icon = isIn ? TrendingUp : isOut ? TrendingDown : ArrowLeftRight

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cls,
      )}
    >
      <Icon size={10} />
      {type.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockMovementsPage() {
  const { page, limit, sortBy, sortOrder, setPage, setLimit, setSort, resetPage } = usePagination()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const filters = useMemo(
    () => ({ page, limit, search, date_from: dateFrom || undefined, date_to: dateTo || undefined, sort_by: sortBy, sort_order: sortOrder }),
    [page, limit, search, dateFrom, dateTo, sortBy, sortOrder],
  )

  const query = useQuery({
    queryKey: MOVEMENTS_KEY(filters),
    queryFn:  () => inventoryApi.listMovements(filters).then((r) => r.data),
  })

  const handleSearch = useCallback(
    (q: string) => { setSearch(q); resetPage() },
    [resetPage],
  )

  const columns = useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        id: 'created_at',
        header: 'Date',
        meta: { sortKey: 'created_at', defaultSortDir: 'DESC' as const },
        cell: ({ row }) => (
          <span className="number text-xs text-foreground/60">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {row.original.product?.product_name ?? row.original.product_id}
          </span>
        ),
      },
      {
        id: 'movement_type',
        header: 'Type',
        meta: { sortKey: 'movement_type', defaultSortDir: 'ASC' as const },
        cell: ({ row }) => <MovementTypeBadge type={row.original.movement_type} />,
      },
      {
        id: 'quantity_in',
        header: 'In',
        meta: { sortKey: 'quantity_in', defaultSortDir: 'DESC' as const },
        cell: ({ row }) => (
          <span className="number text-xs text-emerald-400">
            {row.original.quantity_in > 0 ? '+' + formatLitres(row.original.quantity_in) : '—'}
          </span>
        ),
      },
      {
        id: 'quantity_out',
        header: 'Out',
        meta: { sortKey: 'quantity_out', defaultSortDir: 'DESC' as const },
        cell: ({ row }) => (
          <span className="number text-xs text-rose-400">
            {row.original.quantity_out > 0 ? '-' + formatLitres(row.original.quantity_out) : '—'}
          </span>
        ),
      },
      {
        id: 'balance_after',
        header: 'Balance After',
        cell: ({ row }) => (
          <span className="number text-xs font-medium text-foreground/80">
            {formatLitres(row.original.balance_after)}
          </span>
        ),
      },
      {
        id: 'reference_type',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="text-xs text-foreground/35">
            {row.original.reference_type ?? '—'}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Stock Movements"
        description="Full ledger of inventory changes"
      />

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            className="rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground/70 outline-none focus:border-[#E85D04]/50 number"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            className="rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground/70 outline-none focus:border-[#E85D04]/50 number"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); resetPage() }}
            className="text-xs text-foreground/35 hover:text-foreground/60"
          >
            Clear
          </button>
        )}
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
        searchable
        onSearch={handleSearch}
        emptyMessage="No stock movements recorded"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSort}
      />
    </div>
  )
}
