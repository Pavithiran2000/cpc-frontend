'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'

import { reportsApi } from '@/lib/api/reports'
import type { ProfitLossReport } from '@/lib/types'
import { formatCurrency, cn } from '@/lib/utils'

function defaultFrom() {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}

interface PLRow {
  label: string
  value: number
  indent?: boolean
  bold?: boolean
  variant?: 'positive' | 'negative' | 'neutral'
  divider?: boolean
}

function PLSection({ title, rows }: { title: string; rows: PLRow[] }) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-foreground/35">{title}</h3>
      <div className="overflow-hidden rounded-lg border border-border/60">
        {rows.map((row, i) => (
          <div key={i}
            className={cn(
              'flex items-center justify-between px-4 py-2.5',
              i % 2 === 0 ? 'bg-card' : 'bg-muted/30',
              row.divider && 'border-t-2 border-border',
            )}>
            <span className={cn('text-sm', row.indent && 'pl-4 text-foreground/60', row.bold && 'font-semibold text-foreground', !row.indent && !row.bold && 'text-foreground/70')}>
              {row.label}
            </span>
            <span className={cn('number text-sm font-semibold',
              row.variant === 'positive' ? 'text-emerald-400'
              : row.variant === 'negative' ? 'text-rose-400'
              : row.bold ? 'text-foreground' : 'text-foreground/70',
            )}>
              {row.value < 0 ? '-' : ''}{formatCurrency(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10))

  const query = useQuery({
    queryKey: ['report-profit-loss', dateFrom, dateTo],
    queryFn:  () => reportsApi.profitLoss({ date_from: dateFrom, date_to: dateTo }).then((r) => r.data as ProfitLossReport),
  })

  const pl = query.data

  const rows = useMemo<PLRow[]>(() => {
    if (!pl) return []
    return [
      { label: 'Total Revenue',        value: pl.revenue,                  bold: true, variant: 'positive' },
      { label: 'Supplier Payments',    value: -pl.supplier_payments,        indent: true, variant: 'negative' },
      { label: 'Approved Deductions',  value: -pl.approved_deductions,      indent: true, variant: 'negative' },
      { label: 'Gross Profit (est.)',  value: pl.gross_profit_estimate,     bold: true, divider: true,
        variant: pl.gross_profit_estimate >= 0 ? 'positive' : 'negative' },
      { label: 'Net Profit (est.)',    value: pl.net_profit_estimate,       bold: true, divider: true,
        variant: pl.net_profit_estimate >= 0 ? 'positive' : 'negative' },
    ]
  }, [pl])

  if (query.isLoading) {
    return (
      <div className="p-5">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted/50" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Profit & Loss</h1>
          <p className="mt-1 text-sm text-foreground/50">Financial summary for the selected period</p>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground/60 hover:text-foreground/80">
          <Printer size={14} /> Print
        </button>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground/70 outline-none focus:border-[#E85D04]/60" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground/70 outline-none focus:border-[#E85D04]/60" />
        </div>
      </div>

      {pl ? (
        <div className="max-w-2xl">
          <PLSection title="Profit & Loss Statement" rows={rows} />
        </div>
      ) : (
        <p className="text-sm text-foreground/40">No data for the selected period.</p>
      )}
    </div>
  )
}
