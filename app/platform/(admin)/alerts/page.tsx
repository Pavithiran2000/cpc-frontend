'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bell, CheckCheck, RefreshCw, ShieldAlert, AlertTriangle, Info, Construction,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { formatRelativeTime } from '@/lib/utils'
import type { PlatformAlert, AlertSeverity, PaginatedResponse } from '@/lib/platform-types'

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const cls =
    severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400' :
    severity === 'WARNING' ? 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400' :
    'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400'
  const Icon =
    severity === 'CRITICAL' ? ShieldAlert :
    severity === 'WARNING' ? AlertTriangle :
    Info
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon size={10} /> {severity}
    </span>
  )
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onAcknowledge,
  acknowledging,
}: {
  alert: PlatformAlert
  onAcknowledge: (id: string) => void
  acknowledging: boolean
}) {
  const leftBorder =
    alert.severity === 'CRITICAL' ? 'border-l-rose-400' :
    alert.severity === 'WARNING' ? 'border-l-amber-400' :
    'border-l-sky-400'

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border border-border bg-card p-5 border-l-4 ${leftBorder} ${
        alert.acknowledged ? 'opacity-50' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-foreground/40 font-medium">{alert.type.replace(/_/g, ' ')}</span>
          {alert.acknowledged && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCheck size={10} /> Acknowledged
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/80">{alert.message}</p>
        <p className="mt-1.5 text-xs text-foreground/40">
          {formatRelativeTime(alert.createdAt)}
          {alert.acknowledged && alert.acknowledgedByEmail && (
            <> · Acknowledged by {alert.acknowledgedByEmail}</>
          )}
        </p>
      </div>

      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          disabled={acknowledging}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/60 hover:bg-foreground/5 transition-colors disabled:opacity-40"
        >
          <CheckCheck size={13} /> Acknowledge
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const queryClient = useQueryClient()

  const alertsQ = useQuery<PlatformAlert[]>({
    queryKey: ['platform', 'alerts'],
    queryFn: async () => {
      const res = await platformApi.alerts.list()
      const d = res.data as PlatformAlert[] | PaginatedResponse<PlatformAlert>
      return Array.isArray(d) ? d : (d.data ?? [])
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['platform', 'alerts'] })

  const acknowledgeMut = useMutation({
    mutationFn: (id: string) => platformApi.alerts.acknowledge(id),
    onSuccess: () => { toast.success('Alert acknowledged'); refresh() },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const dismissAllMut = useMutation({
    mutationFn: () => platformApi.alerts.acknowledgeAll(),
    onSuccess: () => { toast.success('All alerts acknowledged'); refresh() },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const alerts = alertsQ.data ?? []
  const unacknowledged = alerts.filter((a) => !a.acknowledged)
  const acknowledged = alerts.filter((a) => a.acknowledged)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Alerts</h1>
          <p className="mt-0.5 text-sm text-foreground/50">
            Platform alerts and notifications
            {unacknowledged.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {unacknowledged.length} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unacknowledged.length > 0 && (
            <button
              onClick={() => dismissAllMut.mutate()}
              disabled={dismissAllMut.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5 disabled:opacity-40"
            >
              <CheckCheck size={13} /> Dismiss All
            </button>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/60 hover:bg-foreground/5"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {alertsQ.isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 mb-4">
            <Construction size={22} className="text-amber-500" />
          </div>
          <p className="font-syne text-base font-bold text-foreground/80">Coming Soon</p>
          <p className="mt-1 text-sm text-foreground/40">Alert management will be available in a future update</p>
        </div>
      ) : alertsQ.isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
            <Bell size={22} className="text-emerald-500" />
          </div>
          <p className="font-syne text-base font-bold text-foreground/80">No alerts</p>
          <p className="mt-1 text-sm text-foreground/40">All systems are running normally</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unacknowledged.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                Unacknowledged ({unacknowledged.length})
              </p>
              {unacknowledged.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={(id) => acknowledgeMut.mutate(id)}
                  acknowledging={acknowledgeMut.isPending}
                />
              ))}
            </div>
          )}

          {acknowledged.length > 0 && (
            <div className="space-y-3 mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                Acknowledged ({acknowledged.length})
              </p>
              {acknowledged.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={(id) => acknowledgeMut.mutate(id)}
                  acknowledging={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
