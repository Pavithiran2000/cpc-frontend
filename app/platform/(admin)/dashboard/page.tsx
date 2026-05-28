'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  ClipboardList,
} from 'lucide-react'
import { platformApi } from '@/lib/platform-api'
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  actionLabel,
} from '@/lib/utils'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type {
  DashboardStats,
  TenantGrowthPoint,
  StatusDistribution,
  PlatformActivityLog,
  TenantSummary,
} from '@/lib/platform-types'

// ─── Query keys ───────────────────────────────────────────────────────────────

const REFETCH_MS = 60_000

// ─── Shared card shell ────────────────────────────────────────────────────────

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>
      {children}
    </div>
  )
}

// ─── Growth chart ─────────────────────────────────────────────────────────────

function GrowthChart({
  data,
  isLoading,
  theme,
}: {
  data: TenantGrowthPoint[]
  isLoading: boolean
  theme: string | undefined
}) {
  const isDark = theme !== 'light'
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const axisColor = isDark ? '#64748b' : '#94a3b8'
  const tooltipBg = isDark ? '#18181C' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'

  return (
    <Card className="p-6 lg:col-span-2">
      <p className="mb-4 text-sm font-semibold text-foreground">
        Tenant Growth — Last 12 Months
      </p>
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-foreground/8" />
      ) : data.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-foreground/40">
          No growth data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={208}>
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 8,
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
            <Bar
              dataKey="newTenants"
              name="New tenants"
              fill="#E85D04"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              name="Total tenants"
              stroke="#E85D04"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

const DONUT_COLORS: Record<string, string> = {
  ACTIVE: '#2D6A4F',
  INACTIVE: '#6B6B78',
  SUSPENDED: '#E63946',
}

function StatusDonut({
  data,
  isLoading,
  theme,
}: {
  data: StatusDistribution[]
  isLoading: boolean
  theme: string | undefined
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const legendColor = theme !== 'light' ? '#64748b' : '#94a3b8'

  return (
    <Card className="p-6">
      <p className="mb-4 text-sm font-semibold text-foreground">
        Status Distribution
      </p>
      {isLoading ? (
        <div className="flex h-52 items-center justify-center">
          <div className="h-36 w-36 animate-pulse rounded-full bg-foreground/8" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-foreground/40">
          No data available
        </div>
      ) : (
        <div className="relative flex h-52 items-center justify-center">
          <ResponsiveContainer width="100%" height={208}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={84}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={DONUT_COLORS[entry.status] ?? '#6B6B78'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v, name) => [v, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: legendColor }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-foreground tabular-nums">
              {formatNumber(total)}
            </span>
            <span className="text-xs text-foreground/40">total</span>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Recent tenants ───────────────────────────────────────────────────────────

function RecentTenantsCard({
  data,
  isLoading,
}: {
  data: TenantSummary[]
  isLoading: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-foreground">Recent Tenants</p>
        <Link
          href="/platform/tenants"
          className="text-xs text-[#E85D04] hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-foreground/8" />
              <div className="h-4 w-16 animate-pulse rounded bg-foreground/8" />
              <div className="h-4 w-20 animate-pulse rounded bg-foreground/8" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-foreground/40">
          No tenants yet
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/platform/tenants/${t.id}`}
                  className="block truncate text-sm font-medium text-foreground transition-colors hover:text-[#E85D04]"
                >
                  {t.stationName}
                </Link>
              </div>
              <StatusBadge status={t.status} />
              <span className="shrink-0 font-mono text-[11px] text-foreground/40">
                {formatDate(t.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ─── Recent activity ──────────────────────────────────────────────────────────

function RecentActivityCard({
  data,
  isLoading,
}: {
  data: PlatformActivityLog[]
  isLoading: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-foreground">Recent Activity</p>
        <Link
          href="/platform/activity-logs"
          className="text-xs text-[#E85D04] hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3 p-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-foreground/8" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-36 animate-pulse rounded bg-foreground/8" />
                <div className="h-3 w-24 animate-pulse rounded bg-foreground/8" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-foreground/40">
          No activity yet
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((log) => (
            <li key={log.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E85D04]/15 text-xs font-bold uppercase text-[#E85D04]">
                {(log.adminEmail ?? 'S')[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground/70">
                  {log.adminEmail ?? 'System'}
                </p>
                <span className="mt-0.5 inline-block rounded bg-foreground/6 px-1.5 py-px text-[10px] font-medium text-foreground/50">
                  {actionLabel(log.action)}
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-foreground/30">
                {formatRelativeTime(log.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
      <AlertTriangle size={16} className="shrink-0 text-rose-500" />
      <p className="flex-1 text-sm text-rose-700">
        Failed to load dashboard data. Check your API connection.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformDashboardPage() {
  const { resolvedTheme } = useTheme()
  const opts = { refetchInterval: REFETCH_MS, retry: 1 }

  const statsQ = useQuery<DashboardStats>({
    queryKey: ['platform', 'dashboard', 'stats'],
    queryFn: () =>
      platformApi.dashboard.getStats().then((r) => {
        const d = r.data as { stats?: DashboardStats } | DashboardStats
        return ('stats' in d && d.stats) ? d.stats : (d as DashboardStats)
      }),
    ...opts,
  })

  const growthQ = useQuery<TenantGrowthPoint[]>({
    queryKey: ['platform', 'dashboard', 'growth'],
    queryFn: () =>
      platformApi.dashboard.getTenantGrowth().then((r) => {
        const d = r.data as TenantGrowthPoint[] | { data?: TenantGrowthPoint[] }
        return Array.isArray(d) ? d : (d.data ?? [])
      }),
    ...opts,
  })

  const distQ = useQuery<StatusDistribution[]>({
    queryKey: ['platform', 'dashboard', 'distribution'],
    queryFn: () =>
      platformApi.dashboard.getStatusDistribution().then((r) => {
        const d = r.data as StatusDistribution[] | { data?: StatusDistribution[] }
        return Array.isArray(d) ? d : (d.data ?? [])
      }),
    ...opts,
  })

  const activityQ = useQuery<PlatformActivityLog[]>({
    queryKey: ['platform', 'dashboard', 'activity'],
    queryFn: () =>
      platformApi.dashboard.getRecentActivity().then((r) => {
        const d = r.data as PlatformActivityLog[] | { data?: PlatformActivityLog[] }
        return Array.isArray(d) ? d : (d.data ?? [])
      }),
    ...opts,
  })

  const tenantsQ = useQuery<TenantSummary[]>({
    queryKey: ['platform', 'dashboard', 'recentTenants'],
    queryFn: () =>
      platformApi.dashboard.getRecentTenants().then((r) => {
        const d = r.data as TenantSummary[] | { data?: TenantSummary[] }
        return Array.isArray(d) ? d : (d.data ?? [])
      }),
    ...opts,
  })

  const pendingRegsQ = useQuery<{ meta: { total: number } }>({
    queryKey: ['platform', 'registrations', 'pending-count'],
    queryFn: () =>
      platformApi.registrations.list({ status: 'PENDING', limit: 1 }).then(
        (r) => r.data as { meta: { total: number } },
      ),
    ...opts,
  })

  const anyError = statsQ.isError || growthQ.isError || distQ.isError

  const refetchAll = () => {
    statsQ.refetch()
    growthQ.refetch()
    distQ.refetch()
    activityQ.refetch()
    tenantsQ.refetch()
    pendingRegsQ.refetch()
  }

  const stats = statsQ.data
  const statsLoading = statsQ.isLoading
  const momChange = stats?.newTenantsChangePct ?? null

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-foreground/50">
            Global CPC platform overview
          </p>
        </div>
        <button
          onClick={refetchAll}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {anyError && <ErrorBanner onRetry={refetchAll} />}

      {/* Stat cards — row 1 */}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value={formatNumber(stats?.totalTenants ?? 0)}
          icon={Building2}
          variant="default"
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Tenants"
          value={formatNumber(stats?.activeTenants ?? 0)}
          icon={CheckCircle2}
          variant="success"
          isLoading={statsLoading}
        />
        <StatCard
          title="New This Month"
          value={formatNumber(stats?.newTenantsThisMonth ?? 0)}
          icon={TrendingUp}
          variant="fuel"
          change={momChange ?? undefined}
          isLoading={statsLoading}
        />
        <StatCard
          title="Active Sessions"
          value={formatNumber(stats?.activeSessions ?? 0)}
          icon={Activity}
          variant="warning"
          isLoading={statsLoading}
        />
      </div>

      {/* Stat cards — row 2 */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Suspended"
          value={formatNumber(stats?.suspendedTenants ?? 0)}
          icon={AlertTriangle}
          variant="danger"
          isLoading={statsLoading}
        />
        <StatCard
          title="Pending Registrations"
          value={formatNumber(pendingRegsQ.data?.meta?.total ?? 0)}
          icon={ClipboardList}
          variant="warning"
          isLoading={pendingRegsQ.isLoading}
        />
        <StatCard
          title="Failed Logins 24h"
          value={formatNumber(stats?.failedLogins_24h ?? 0)}
          icon={ShieldAlert}
          variant="danger"
          isLoading={statsLoading}
        />
      </div>

      {/* Charts row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <GrowthChart
          data={growthQ.data ?? []}
          isLoading={growthQ.isLoading}
          theme={resolvedTheme}
        />
        <StatusDonut
          data={distQ.data ?? []}
          isLoading={distQ.isLoading}
          theme={resolvedTheme}
        />
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentTenantsCard
          data={tenantsQ.data ?? []}
          isLoading={tenantsQ.isLoading}
        />
        <RecentActivityCard
          data={activityQ.data ?? []}
          isLoading={activityQ.isLoading}
        />
      </div>
    </div>
  )
}
