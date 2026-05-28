'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Database,
  MemoryStick,
  Clock,
  Activity,
  BarChart3,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  ShieldAlert,
} from 'lucide-react'
import { platformApi } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { formatUptime, formatDateTime } from '@/lib/utils'
import type { SystemHealth } from '@/lib/platform-types'

const REFETCH_MS = 30_000

// ─── Card shell ───────────────────────────────────────────────────────────────

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-foreground/8 ${className}`} />
  )
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type HealthStatus = 'healthy' | 'degraded' | 'down' | string

function statusColor(status: HealthStatus) {
  if (status === 'healthy') return 'text-emerald-600'
  if (status === 'degraded' || status === 'slow') return 'text-amber-600'
  return 'text-rose-600'
}

function statusDot(status: HealthStatus) {
  if (status === 'healthy')
    return 'h-2 w-2 rounded-full bg-emerald-500/100 shadow-[0_0_6px_#10b981]'
  if (status === 'degraded' || status === 'slow')
    return 'h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]'
  return 'h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]'
}

// ─── Overall status banner ────────────────────────────────────────────────────

function StatusBanner({
  status,
  timestamp,
}: {
  status: HealthStatus
  timestamp: string
}) {
  const isHealthy = status === 'healthy'
  const isDegraded = status === 'degraded'

  const [bgCls, textCls, borderCls, Icon, message] = isHealthy
    ? [
        'bg-emerald-500/100/10',
        'text-emerald-600 dark:text-emerald-400',
        'border-emerald-500/25',
        CheckCircle2,
        'All systems operational',
      ]
    : isDegraded
    ? [
        'bg-amber-500/10',
        'text-amber-600 dark:text-amber-400',
        'border-amber-500/25',
        AlertTriangle,
        'Degraded performance detected',
      ]
    : [
        'bg-rose-500/10',
        'text-rose-600 dark:text-rose-400',
        'border-rose-500/25',
        XCircle,
        'System issues detected',
      ]

  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-xl border px-5 py-4 ${bgCls} ${borderCls}`}
    >
      <Icon size={18} className={textCls} />
      <div className="flex-1">
        <p className={`font-semibold ${textCls}`}>{message}</p>
        <p className="text-xs text-foreground/40">
          Last updated: {formatDateTime(timestamp)}
        </p>
      </div>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${textCls} ${borderCls}`}
      >
        {status}
      </span>
    </div>
  )
}

// ─── Database card ────────────────────────────────────────────────────────────

function DatabaseCard({ health }: { health: SystemHealth }) {
  const db = health.services.database
  const label =
    db.status === 'healthy'
      ? 'Healthy'
      : db.status === 'degraded' || db.status === 'slow'
      ? 'Degraded'
      : 'Down'

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <Database size={15} className="text-violet-600" />
          </div>
          <p className="text-sm font-semibold text-foreground/80">Database</p>
        </div>
        <div className={statusDot(db.status)} />
      </div>
      <p className={`text-2xl font-bold font-mono tabular-nums ${statusColor(db.status)}`}>
        {db.latencyMs >= 0 ? `${db.latencyMs}ms` : '—'}
      </p>
      <p className="mt-1 text-xs text-foreground/40">Latency · {label}</p>
    </Card>
  )
}

// ─── Memory card ──────────────────────────────────────────────────────────────

function MemoryCard({ health }: { health: SystemHealth }) {
  const mem = health.services.memory
  const pct = mem.heapTotalMb > 0
    ? Math.round((mem.heapUsedMb / mem.heapTotalMb) * 100)
    : 0
  const barColor =
    pct > 85 ? 'bg-rose-500' : pct > 65 ? 'bg-amber-400' : 'bg-emerald-500/100'

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
          <MemoryStick size={15} className="text-sky-600" />
        </div>
        <p className="text-sm font-semibold text-foreground/80">Memory</p>
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
        {mem.heapUsedMb}
        <span className="ml-1 text-sm font-normal text-foreground/40">
          / {mem.heapTotalMb} MB
        </span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-foreground/40">
        Heap {pct}% · RSS {mem.rssMb} MB
      </p>
    </Card>
  )
}

// ─── Uptime card ──────────────────────────────────────────────────────────────

function UptimeCard({ health }: { health: SystemHealth }) {
  const s = health.metrics?.uptimeSeconds ?? 0
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <Clock size={15} className="text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-foreground/80">Uptime</p>
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
        {formatUptime(s)}
      </p>
      <p className="mt-1 text-xs text-foreground/40">{s.toLocaleString()} seconds</p>
    </Card>
  )
}

// ─── Metric card (generic) ────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon size={15} className={iconColor} />
        </div>
        <p className="text-sm font-semibold text-foreground/80">{label}</p>
      </div>
      <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-foreground/40">{sub}</p>}
    </Card>
  )
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

// ─── 403 page ─────────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
        <XCircle size={28} className="text-rose-500" />
      </div>
      <div>
        <p className="font-syne text-lg font-bold text-foreground">Access Denied</p>
        <p className="mt-1 text-sm text-foreground/50">
          System Health is only available to SUPER_ADMIN users.
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemHealthPage() {
  const { hasRole, initialized } = usePlatformAuth()
  const router = useRouter()

  const isSuperAdmin = hasRole('SUPER_ADMIN')

  // Redirect non-super-admins to dashboard
  useEffect(() => {
    if (initialized && !isSuperAdmin) {
      router.replace('/platform/dashboard')
    }
  }, [initialized, isSuperAdmin, router])

  const { data, isLoading, isError, refetch, dataUpdatedAt } =
    useQuery<SystemHealth>({
      queryKey: ['platform', 'system-health'],
      queryFn: () =>
        platformApi.systemHealth.get().then((r) => r.data as SystemHealth),
      refetchInterval: REFETCH_MS,
      enabled: isSuperAdmin,
    })

  if (!initialized) return null
  if (!isSuperAdmin) return <AccessDenied />

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">
            System Health
          </h1>
          <p className="mt-0.5 text-sm text-foreground/50">
            Runtime and infrastructure status
            {dataUpdatedAt > 0 && (
              <span className="ml-2 text-foreground/30">
                · updated {formatDateTime(new Date(dataUpdatedAt))}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <XCircle size={16} className="shrink-0 text-rose-500" />
          <p className="flex-1 text-sm text-rose-700">
            Failed to reach system health endpoint.
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Status banner */}
      {isLoading && (
        <div className="mb-6 h-16 animate-pulse rounded-xl bg-foreground/8" />
      )}
      {data && (
        <StatusBanner status={data.status} timestamp={data.timestamp} />
      )}

      {/* Metric cards */}
      {isLoading ? (
        <SkeletonGrid />
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DatabaseCard health={data} />
          <MemoryCard health={data} />
          <UptimeCard health={data} />
          <MetricCard
            icon={Activity}
            iconBg="bg-orange-500/10"
            iconColor="text-orange-500"
            label="Active Sessions"
            value={(data.metrics?.activePlatformSessions ?? 0).toLocaleString()}
            sub="Platform admin sessions"
          />
          <MetricCard
            icon={BarChart3}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-400"
            label="API Requests Today"
            value={(data.metrics?.apiRequestsToday ?? 0).toLocaleString()}
            sub="Activity log entries"
          />
          <MetricCard
            icon={ShieldAlert}
            iconBg="bg-rose-500/10"
            iconColor="text-rose-500"
            label="Failed Logins Today"
            value={(data.metrics?.failedLoginsToday ?? 0).toLocaleString()}
            sub="Login failures since midnight"
          />
          <MetricCard
            icon={Cpu}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-500"
            label="CPU Load (1 min)"
            value={`${data.metrics?.cpuLoad_1min ?? 0}`}
            sub={`${data.metrics?.cpuCount ?? 0} logical cores`}
          />
          <MetricCard
            icon={Terminal}
            iconBg="bg-foreground/8"
            iconColor="text-foreground/60"
            label="Node.js Version"
            value={data.nodeVersion}
            sub={`${data.metrics?.totalTenants ?? 0} total tenants`}
          />
        </div>
      ) : null}
    </div>
  )
}
