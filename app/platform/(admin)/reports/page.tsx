'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Users, Activity, ClipboardList,
  TrendingUp, Calendar, ArrowRight,
} from 'lucide-react'
import { platformApi } from '@/lib/platform-api'
import { formatNumber } from '@/lib/utils'
import type { DashboardStats } from '@/lib/platform-types'

// ─── Report tile ──────────────────────────────────────────────────────────────

interface ReportTileProps {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  description: string
  href: string
  stat?: string
  statLabel?: string
}

function ReportTile({
  icon: Icon, iconBg, iconColor, title, description, href, stat, statLabel,
}: ReportTileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 hover:border-[#E85D04]/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        {stat && (
          <div className="text-right">
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">{stat}</p>
            {statLabel && <p className="text-xs text-foreground/40">{statLabel}</p>}
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="font-syne font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-foreground/50">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-[#E85D04] group-hover:gap-2 transition-all">
        View Report <ArrowRight size={12} />
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformReportsPage() {
  const statsQ = useQuery<DashboardStats>({
    queryKey: ['platform', 'dashboard', 'stats'],
    queryFn: () =>
      platformApi.dashboard.getStats().then((r) => {
        const d = r.data as { stats?: DashboardStats } | DashboardStats
        return ('stats' in d && d.stats) ? d.stats : (d as DashboardStats)
      }),
    staleTime: 60_000,
  })

  const stats = statsQ.data

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-syne text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-foreground/50">
          Platform-wide insights across tenants, registrations, and admin activity
        </p>
      </div>

      {/* Overview stats */}
      {stats && (
        <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Tenants', value: formatNumber(stats.totalTenants), color: 'text-foreground' },
            { label: 'Active', value: formatNumber(stats.activeTenants), color: 'text-emerald-600' },
            { label: 'New This Month', value: formatNumber(stats.newTenantsThisMonth), color: 'text-[#E85D04]' },
            { label: 'Suspended', value: formatNumber(stats.suspendedTenants ?? 0), color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40">{label}</p>
              <p className={`mt-2 font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report tiles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ReportTile
          icon={Building2}
          iconBg="bg-[#E85D04]/10"
          iconColor="text-[#E85D04]"
          title="Tenant Activity"
          description="Shift sessions, revenue trends, and activity across all tenants"
          href="/platform/tenants"
          stat={stats ? formatNumber(stats.totalTenants) : undefined}
          statLabel="total tenants"
        />

        <ReportTile
          icon={ClipboardList}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          title="Registration Trends"
          description="Pending approvals, approval rates, and registration funnel"
          href="/platform/registrations"
          stat={stats ? formatNumber(stats.newTenantsThisMonth ?? 0) : undefined}
          statLabel="new this month"
        />

        <ReportTile
          icon={Users}
          iconBg="bg-sky-500/10"
          iconColor="text-sky-600"
          title="Admin Activity"
          description="Platform admin login history, actions, and audit trail"
          href="/platform/activity-logs"
          stat={stats ? formatNumber(stats.totalPortalUsers) : undefined}
          statLabel="portal users"
        />

        <ReportTile
          icon={Activity}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-600"
          title="Security Events"
          description="Failed logins, MFA failures, and suspicious activity summary"
          href="/platform/security"
          stat={stats ? formatNumber(stats.failedLogins_24h ?? 0) : undefined}
          statLabel="failed logins 24h"
        />

        <ReportTile
          icon={TrendingUp}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600"
          title="Growth Overview"
          description="Monthly tenant growth, churn, and platform adoption metrics"
          href="/platform/dashboard"
        />

        <ReportTile
          icon={Calendar}
          iconBg="bg-rose-500/10"
          iconColor="text-rose-600"
          title="Session Analytics"
          description="Active sessions, session duration, and multi-device usage stats"
          href="/platform/security"
        />
      </div>

      <p className="mt-8 text-center text-xs text-foreground/40">
        Detailed report exports and custom date ranges are available via the API.
      </p>
    </div>
  )
}
