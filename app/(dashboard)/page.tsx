'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { parseISO, format, formatDistanceToNow } from 'date-fns'
import {
  Banknote,
  Droplets,
  Activity,
  AlertTriangle,
  Truck,
  Package,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { reportsApi }    from '@/lib/api/reports'
import { shiftsApi }     from '@/lib/api/shifts'
import { bowserApi }     from '@/lib/api/bowser'
import { inventoryApi }  from '@/lib/api/inventory'
import { formatCurrency, formatLitres, formatDate, formatDateTime } from '@/lib/utils'
import { StatCard }      from '@/components/shared/StatCard'
import { StatusBadge }   from '@/components/shared/StatusBadge'
import { EmptyState }    from '@/components/shared/EmptyState'
import { PageHeader }    from '@/components/shared/PageHeader'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { DashboardReport, ShiftSession, BowserReceipt, StockBalance } from '@/lib/types'

// ─── Colour helpers ───────────────────────────────────────────────────────────

const FUEL_COLOR_RULES = [
  { keyword: 'petrol',    color: '#E85D04' },
  { keyword: 'unleaded',  color: '#E85D04' },
  { keyword: 'diesel',    color: '#F48C06' },
  { keyword: 'kero',      color: '#6B6B78' },
]
const FUEL_FALLBACKS = ['#E85D04', '#F48C06', '#6B6B78', '#4B5563']

function fuelColor(name: string, idx: number) {
  const lower = name.toLowerCase()
  return (
    FUEL_COLOR_RULES.find(({ keyword }) => lower.includes(keyword))?.color ??
    FUEL_FALLBACKS[idx % FUEL_FALLBACKS.length]
  )
}

// ─── Revenue chart ────────────────────────────────────────────────────────────

const GRAD_ID = 'revGrad'

const tickStyle = {
  fontSize: 10,
  fontFamily: 'var(--font-ibm-plex-mono)',
  fill: 'rgba(255,255,255,0.35)',
}

function RevTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#18181C] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 text-white/40">
        {label ? format(parseISO(label), 'd MMM yyyy') : ''}
      </p>
      <p className="number font-semibold text-[#E85D04]">
        {formatCurrency(payload[0]?.value)}
      </p>
    </div>
  )
}

function RevenueChart({
  series,
  isLoading,
}: {
  series: DashboardReport['revenue_last_7_days']
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex h-[220px] animate-pulse items-end gap-1.5 px-2 pb-4">
        {[55, 70, 42, 88, 65, 78, 50].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-white/8" style={{ height: `${h}%` }} />
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#E85D04" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#E85D04" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(parseISO(d as string), 'd MMM')}
          tick={tickStyle}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
            : v >= 1_000   ? `${(v / 1_000).toFixed(0)}k`
            : String(v)
          }
          tick={tickStyle}
          axisLine={false}
          tickLine={false}
          width={46}
        />
        <Tooltip
          content={<RevTooltip />}
          cursor={{ stroke: '#E85D04', strokeWidth: 1, strokeOpacity: 0.2 }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#E85D04"
          strokeWidth={2}
          fill={`url(#${GRAD_ID})`}
          dot={false}
          activeDot={{ r: 4, fill: '#E85D04', stroke: '#0A0A0B', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Fuel pie chart ───────────────────────────────────────────────────────────

function PieTooltipContent({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#18181C] px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50">{payload[0].name}</p>
      <p className="number font-semibold text-white">{formatLitres(payload[0].value)}</p>
    </div>
  )
}

function FuelPieChart({
  series,
  isLoading,
}: {
  series: DashboardReport['fuel_sales_by_product']
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-[170px] w-[170px] animate-pulse rounded-full bg-white/8" />
        <div className="flex gap-4">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white/8" />
              <div className="h-2.5 animate-pulse rounded bg-white/8" style={{ width: w }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!series.length) {
    return <EmptyState icon={Package} message="No fuel sales data" />
  }

  return (
    <div className="flex flex-col items-center">
      <div style={{ height: 180, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={series}
              dataKey="litres"
              nameKey="product_name"
              cx="50%"
              cy="50%"
              outerRadius={82}
              innerRadius={52}
              strokeWidth={0}
            >
              {series.map((item, i) => (
                <Cell
                  key={item.product_name}
                  fill={fuelColor(item.product_name, i)}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {series.map((item, i) => (
          <div key={item.product_name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: fuelColor(item.product_name, i) }}
            />
            <span className="text-xs text-white/55">{item.product_name}</span>
            <span className="number text-xs font-medium text-white/80">
              {formatLitres(item.litres)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Compact table: Active shift sessions ─────────────────────────────────────

function ActiveShiftsTable({
  sessions,
  isLoading,
}: {
  sessions: ShiftSession[]
  isLoading: boolean
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/5">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#111114] px-4 py-3">
        <h3 className="font-syne text-sm font-semibold text-white/80">
          Active Shift Sessions
        </h3>
        <Link
          href="/shifts/sessions"
          className="flex items-center gap-1 text-xs text-[#E85D04] hover:underline"
        >
          View All <ExternalLink size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="animate-pulse divide-y divide-white/5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-3 w-20 rounded bg-white/8" />
              <div className="h-3 w-24 rounded bg-white/8" />
              <div className="h-4 w-14 rounded-full bg-white/8" />
              <div className="ml-auto h-3 w-16 rounded bg-white/8" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={Activity} message="No active shift sessions" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              {['Date', 'Shift', 'Status', 'Opened', ''].map((h) => (
                <TableHead
                  key={h}
                  className="h-8 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/35"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s, i) => (
              <TableRow
                key={s.id}
                className={cn(
                  'border-white/5',
                  i % 2 === 0 ? 'bg-[#18181C]' : 'bg-[#1A1A1E]',
                )}
              >
                <TableCell className="number px-3 py-2 text-xs text-white/70">
                  {formatDate(s.business_date)}
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-white/70">
                  {s.shift_template?.name ?? '—'}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell className="number px-3 py-2 text-xs text-white/45">
                  {s.opened_at ? formatDateTime(s.opened_at) : '—'}
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  <Link
                    href="/shifts/sessions"
                    className="text-xs text-[#E85D04] hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

// ─── Compact table: Recent bowser receipts ────────────────────────────────────

function RecentReceiptsTable({
  receipts,
  isLoading,
}: {
  receipts: BowserReceipt[]
  isLoading: boolean
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/5">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#111114] px-4 py-3">
        <h3 className="font-syne text-sm font-semibold text-white/80">
          Recent Bowser Receipts
        </h3>
        <Link
          href="/bowser-receipts"
          className="flex items-center gap-1 text-xs text-[#E85D04] hover:underline"
        >
          View All <ExternalLink size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="animate-pulse divide-y divide-white/5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-3 w-20 rounded bg-white/8" />
              <div className="h-3 w-28 rounded bg-white/8" />
              <div className="h-4 w-16 rounded-full bg-white/8" />
              <div className="ml-auto h-3 w-16 rounded bg-white/8" />
            </div>
          ))}
        </div>
      ) : receipts.length === 0 ? (
        <EmptyState icon={Truck} message="No bowser receipts" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              {['Receipt No', 'Supplier', 'Status', 'Date'].map((h) => (
                <TableHead
                  key={h}
                  className="h-8 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/35"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((r, i) => (
              <TableRow
                key={r.id}
                className={cn(
                  'border-white/5',
                  i % 2 === 0 ? 'bg-[#18181C]' : 'bg-[#1A1A1E]',
                )}
              >
                <TableCell className="number px-3 py-2 text-xs font-medium text-white/75">
                  {r.receipt_no}
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-white/65">
                  {r.supplier_name ?? '—'}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="number px-3 py-2 text-xs text-white/45">
                  {formatDate(r.received_date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

// ─── Stock level bars ─────────────────────────────────────────────────────────

function StockLevelBars({
  balances,
  capacityMap,
  isLoading,
}: {
  balances: StockBalance[]
  capacityMap: Record<string, number>
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/5 bg-[#18181C] p-5">
        <h3 className="font-syne mb-4 text-sm font-semibold text-white/80">
          Stock Levels
        </h3>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-32 shrink-0 rounded bg-white/8" />
              <div className="h-1.5 flex-1 rounded-full bg-white/8" />
              <div className="h-3 w-24 shrink-0 rounded bg-white/8" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!balances.length) return null

  return (
    <div className="rounded-lg border border-white/5 bg-[#18181C] p-5">
      <h3 className="font-syne mb-4 text-sm font-semibold text-white/80">
        Stock Levels
      </h3>
      <div className="space-y-3.5">
        {balances.map((b) => {
          const cap = capacityMap[b.product_id]
          const pct = cap
            ? Math.min(100, (b.quantity / cap) * 100)
            : null
          const barPct  = pct ?? 50
          const barColor =
            pct === null  ? '#E85D04'
            : pct > 30    ? '#2D6A4F'
            : pct > 10    ? '#E9C46A'
            :               '#E63946'
          const isLitre = b.product?.measurement_unit === 'LITRE'

          return (
            <div key={b.id} className="flex items-center gap-3">
              {/* Name */}
              <span className="w-36 shrink-0 truncate text-xs text-white/55">
                {b.product?.name ?? b.product_id.slice(0, 8)}
              </span>

              {/* Bar track */}
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{ width: `${barPct.toFixed(1)}%`, background: barColor }}
                />
              </div>

              {/* Quantity + % */}
              <div className="flex w-36 shrink-0 items-center justify-between">
                <span className="number text-xs text-white/55">
                  {isLitre ? formatLitres(b.quantity) : `${b.quantity} units`}
                </span>
                {pct !== null && (
                  <span
                    className="number text-[10px] font-semibold"
                    style={{ color: barColor }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const queryClient = useQueryClient()

  const dashQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then((r) => r.data),
    refetchInterval: 5 * 60 * 1_000,
  })

  const shiftsQuery = useQuery({
    queryKey: ['shift-sessions', { status: 'OPEN', limit: 5 }],
    queryFn: () =>
      shiftsApi.listSessions({ status: 'OPEN', limit: 5 }).then((r) => r.data.data),
    staleTime: 60_000,
  })

  const receiptsQuery = useQuery({
    queryKey: ['bowser-receipts', { limit: 5 }],
    queryFn: () => bowserApi.list({ limit: 5 }).then((r) => r.data.data),
    staleTime: 60_000,
  })

  const balancesQuery = useQuery({
    queryKey: ['stock-balances', { limit: 100 }],
    queryFn: () => inventoryApi.listBalances({ limit: 100 }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
  })

  const tanksQuery = useQuery({
    queryKey: ['tanks', { limit: 100 }],
    queryFn: () => inventoryApi.listTanks({ limit: 100 }).then((r) => r.data.data),
    staleTime: 10 * 60_000,
  })

  // Capacity map: product_id → total litres across all tanks
  const capacityMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of (tanksQuery.data ?? [])) {
      map[t.fuel_product_id] = (map[t.fuel_product_id] ?? 0) + t.capacity_litres
    }
    return map
  }, [tanksQuery.data])

  const data     = dashQuery.data
  const isLoading = dashQuery.isLoading
  const isFetching = dashQuery.isFetching

  const lastUpdated = dashQuery.dataUpdatedAt
    ? formatDistanceToNow(new Date(dashQuery.dataUpdatedAt), { addSuffix: true })
    : '—'

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['shift-sessions'] })
    queryClient.invalidateQueries({ queryKey: ['bowser-receipts'] })
    queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
    queryClient.invalidateQueries({ queryKey: ['tanks'] })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header + refresh */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Dashboard"
          subtitle="Live overview of today's operations"
          className="mb-0"
        />
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-white/30 sm:block">
            Updated {lastUpdated}
          </span>
          <button
            onClick={handleRefresh}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-white/50 transition-colors hover:border-[#E85D04]/30 hover:text-[#E85D04]"
          >
            <RotateCcw
              size={13}
              className={cn('transition-transform', isFetching && 'animate-spin')}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Row 1 — 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data?.today_revenue)}
          icon={Banknote}
          variant="fuel"
          isLoading={isLoading}
        />
        <StatCard
          title="Fuel Dispensed"
          value={formatLitres(data?.fuel_dispensed_today)}
          icon={Droplets}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Shifts"
          value={String(data?.active_shift_count ?? 0)}
          icon={Activity}
          isLoading={isLoading}
        />
        <StatCard
          title="Cash Shortfalls"
          value={formatCurrency(data?.cash_shortfalls_today)}
          icon={AlertTriangle}
          variant="danger"
          isLoading={isLoading}
        />
      </div>

      {/* Row 2 — 2 stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Pending Bowser Receipts"
          value={String(data?.pending_bowser_receipts ?? 0)}
          icon={Truck}
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          title="Low Stock Alerts"
          value={String(data?.low_stock_alerts ?? 0)}
          icon={Package}
          variant="danger"
          isLoading={isLoading}
        />
      </div>

      {/* Row 3 — Charts (60/40) */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-lg border border-white/5 bg-[#18181C] p-4 lg:col-span-3">
          <h3 className="font-syne mb-4 text-sm font-semibold text-white/80">
            Revenue — Last 7 Days
          </h3>
          <RevenueChart
            series={data?.revenue_last_7_days ?? []}
            isLoading={isLoading}
          />
        </div>

        <div className="rounded-lg border border-white/5 bg-[#18181C] p-4 lg:col-span-2">
          <h3 className="font-syne mb-4 text-sm font-semibold text-white/80">
            Fuel Sales by Product
          </h3>
          <FuelPieChart
            series={data?.fuel_sales_by_product ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Row 4 — Compact tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActiveShiftsTable
          sessions={shiftsQuery.data ?? []}
          isLoading={shiftsQuery.isLoading}
        />
        <RecentReceiptsTable
          receipts={receiptsQuery.data ?? []}
          isLoading={receiptsQuery.isLoading}
        />
      </div>

      {/* Row 5 — Stock level bars */}
      <StockLevelBars
        balances={balancesQuery.data ?? []}
        capacityMap={capacityMap}
        isLoading={balancesQuery.isLoading}
      />
    </div>
  )
}
