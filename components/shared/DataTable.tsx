'use client'

import { useState, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from './EmptyState'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Database, Search } from 'lucide-react'

export type { ColumnDef } from '@tanstack/react-table'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  total: number
  page: number
  limit: number
  onPageChange: (n: number) => void
  onLimitChange: (n: number) => void
  isLoading: boolean
  title?: string
  searchable?: boolean
  onSearch?: (q: string) => void
  filters?: React.ReactNode
  actions?: React.ReactNode
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

const PAGE_SIZES = [10, 25, 50]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i} className="animate-pulse border-border hover:bg-transparent">
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j} className="px-3 py-3">
          <div
            className={cn(
              'h-3 rounded bg-foreground/8',
              j === 0 ? 'w-32' : j % 2 === 0 ? 'w-20' : 'w-24',
            )}
          />
        </TableCell>
      ))}
    </TableRow>
  ))
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  isLoading,
  title,
  searchable,
  onSearch,
  filters,
  actions,
  emptyMessage = 'No records found',
  onRowClick,
}: DataTableProps<T>) {
  const [searchVal, setSearchVal] = useState('')

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => onSearch?.(searchVal), 300)
    return () => clearTimeout(t)
  }, [searchVal, onSearch])

  const table = useReactTable<T>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  const totalPages  = Math.max(1, Math.ceil(total / limit))
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1
  const endRecord   = Math.min(page * limit, total)
  const rows        = table.getRowModel().rows
  const isEmpty     = !isLoading && rows.length === 0

  const hasToolbar = title || searchable || actions

  function headerLabel(def: ColumnDef<T>): string {
    if (typeof def.header === 'string') return def.header
    return (def as { id?: string }).id ?? ''
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      {/* ── Toolbar ── */}
      {hasToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <div className="flex flex-1 items-center gap-3">
            {title && (
              <h2 className="font-syne text-sm font-semibold text-foreground/80">{title}</h2>
            )}
            {searchable && (
              <div className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/30"
                />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search…"
                  className="w-48 rounded border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground/80 placeholder:text-foreground/30 focus:border-[#E85D04]/50 focus:outline-none"
                />
              </div>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* ── Filters slot ── */}
      {filters && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-2">
          {filters}
        </div>
      )}

      {/* ── Desktop table (≥ 640px) ── */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-surface">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-border hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-9 px-3 text-xs font-semibold uppercase tracking-widest text-foreground/35"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={columns.length} />
            ) : isEmpty ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState icon={Database} message={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'border-border transition-colors',
                    i % 2 === 0 ? 'bg-card' : 'bg-muted/30',
                    onRowClick
                      ? 'cursor-pointer hover:bg-[rgba(232,93,4,0.06)]'
                      : 'hover:bg-foreground/[0.02]',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-3 py-2.5 text-sm text-foreground/75"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile cards (< 640px) ── */}
      <div className="sm:hidden">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-border bg-card p-3"
              >
                {Array.from({ length: Math.min(columns.length, 4) }).map((_, j) => (
                  <div key={j} className="flex justify-between py-1.5">
                    <div className="h-2.5 w-20 rounded bg-foreground/10" />
                    <div className="h-2.5 w-24 rounded bg-foreground/10" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState icon={Database} message={emptyMessage} />
        ) : (
          <div className="space-y-2 p-3">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  'rounded-lg border border-border bg-card p-3',
                  onRowClick && 'cursor-pointer hover:border-[#E85D04]/30',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="flex items-start justify-between gap-2 border-b border-border py-1.5 last:border-0"
                  >
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-foreground/35">
                      {headerLabel(cell.column.columnDef)}
                    </span>
                    <span className="text-right text-xs text-foreground/75">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-2.5">
        {/* Per-page */}
        <div className="flex items-center gap-0.5">
          <span className="mr-1.5 text-[10px] text-foreground/30 uppercase tracking-wider">Rows</span>
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => { onLimitChange(size); onPageChange(1) }}
              className={cn(
                'min-w-[28px] rounded px-2 py-0.5 text-xs transition-colors',
                limit === size
                  ? 'bg-[#E85D04]/15 text-[#E85D04]'
                  : 'text-foreground/40 hover:text-foreground/70',
              )}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Record count */}
        <span className="number text-xs text-foreground/30">
          {total === 0
            ? '0 records'
            : `${startRecord}–${endRecord} of ${total}`}
        </span>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-0.5 rounded px-1.5 py-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={13} />
            <span>Prev</span>
          </button>

          <span className="number min-w-[64px] text-center text-xs text-foreground/50">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-0.5 rounded px-1.5 py-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
