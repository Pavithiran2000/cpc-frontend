'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronRight, ArrowLeft, Save, RotateCcw, X, Settings } from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import type { TenantDetail } from '@/lib/platform-types'

// ─── Setting value helpers ─────────────────────────────────────────────────────

function isBoolean(value: string | null): boolean {
  return value === 'true' || value === 'false'
}

function isNumericLike(value: string | null): boolean {
  if (value === null || value.trim() === '') return false
  return !isNaN(Number(value))
}

function parseForSave(key: string, value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  if (isNumericLike(value)) return Number(value)
  return value
}

// ─── Known setting categories ─────────────────────────────────────────────────

const SETTING_CATEGORIES: Record<string, string> = {
  salary_deduction_enabled: 'Payroll',
  cash_shortfall_requires_approval: 'Shift',
  night_shift_enabled: 'Shift',
  night_stock_verification_required: 'Shift',
  allow_shift_overlap: 'Shift',
  currency: 'Locale',
  timezone: 'Locale',
  cpc_report_format: 'Locale',
}

function categoryFor(key: string): string {
  return SETTING_CATEGORIES[key] ?? 'General'
}

function labelFor(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function TenantStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400'
      : status === 'SUSPENDED'
      ? 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400'
      : 'bg-foreground/8 text-foreground/50 border-border'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open, onClose, title, description, onConfirm, loading,
}: {
  open: boolean; onClose: () => void; title: string
  description?: string; onConfirm: () => void; loading?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-foreground/40 hover:bg-foreground/8 hover:text-foreground/60 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">
          {description && <p className="mb-5 text-sm text-foreground/60">{description}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Setting row ──────────────────────────────────────────────────────────────

function SettingRow({
  settingKey, value, onChange, readOnly,
}: {
  settingKey: string
  value: string
  onChange: (key: string, value: string) => void
  readOnly: boolean
}) {
  const label = labelFor(settingKey)

  if (isBoolean(value)) {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-foreground/40 font-mono">{settingKey}</p>
        </div>
        {readOnly ? (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            value === 'true' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' : 'bg-foreground/8 text-foreground/50 border-border'
          }`}>
            {value === 'true' ? 'Enabled' : 'Disabled'}
          </span>
        ) : (
          <button
            onClick={() => onChange(settingKey, value === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value === 'true' ? 'bg-[#E85D04]' : 'bg-foreground/15'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                value === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>
    )
  }

  if (isNumericLike(value)) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-foreground/40 font-mono">{settingKey}</p>
        </div>
        {readOnly ? (
          <span className="font-mono text-sm text-foreground/60">{value}</span>
        ) : (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(settingKey, e.target.value)}
            className="w-32 rounded-lg border border-border bg-background px-3 py-1.5 text-right font-mono text-sm text-foreground focus:border-[#E85D04]/50 focus:outline-none"
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400 font-mono">{settingKey}</p>
      </div>
      {readOnly ? (
        <span className="font-mono text-sm text-slate-600">{value || '—'}</span>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(settingKey, e.target.value)}
          className="w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-[#E85D04]/50 focus:outline-none"
        />
      )}
    </div>
  )
}

// ─── Settings editor (owns form state, initialized from props) ────────────────

function SettingsEditor({
  tenantId,
  settings,
  canWrite,
  onSaved,
}: {
  tenantId: string
  settings: Record<string, string | null>
  canWrite: boolean
  onSaved: () => void
}) {
  const buildInitial = (): Record<string, string> => {
    const m: Record<string, string> = {}
    Object.entries(settings).forEach(([k, v]) => { m[k] = v ?? '' })
    return m
  }

  const [form, setForm] = useState<Record<string, string>>(buildInitial)
  const [originalForm] = useState<Record<string, string>>(buildInitial)
  const [isDirty, setIsDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      setIsDirty(JSON.stringify(next) !== JSON.stringify(originalForm))
      return next
    })
    setApiError('')
  }

  const handleReset = () => {
    setForm(originalForm)
    setIsDirty(false)
    setApiError('')
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const s: Record<string, unknown> = {}
      Object.entries(form).forEach(([k, v]) => { s[k] = parseForSave(k, v) })
      return platformApi.tenants.updateSettings(tenantId, { settings: s })
    },
    onSuccess: () => {
      toast.success('Settings updated')
      setConfirmOpen(false)
      setIsDirty(false)
      onSaved()
    },
    onError: (err) => {
      setApiError(extractPlatformError(err))
      setConfirmOpen(false)
    },
  })

  const settingsEntries = Object.entries(form)
  const groups = settingsEntries.reduce<Record<string, string[]>>((acc, [key]) => {
    const cat = categoryFor(key)
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(key)
    return acc
  }, {})
  const groupOrder = ['General', 'Shift', 'Payroll', 'Locale']
  const sortedGroups = [
    ...groupOrder.filter((g) => groups[g]),
    ...Object.keys(groups).filter((g) => !groupOrder.includes(g)),
  ]

  if (settingsEntries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card py-16 text-center">
        <Settings size={28} className="mx-auto mb-3 text-foreground/25" />
        <p className="text-sm text-foreground/50">No configurable settings for this tenant</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {sortedGroups.map((groupName) => (
          <div key={groupName} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-foreground/3 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">{groupName}</p>
            </div>
            <div className="divide-y divide-border/30 px-6">
              {groups[groupName].map((key) => (
                <SettingRow
                  key={key}
                  settingKey={key}
                  value={form[key] ?? ''}
                  onChange={handleChange}
                  readOnly={!canWrite}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {apiError && (
        <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
          {apiError}
        </div>
      )}

      {canWrite && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={!isDirty}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={13} /> Reset Changes
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!isDirty || saveMut.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={13} /> Save Changes
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Save Settings"
        description="Save tenant setting changes? This will update the tenant&apos;s configuration immediately."
        onConfirm={() => saveMut.mutate()}
        loading={saveMut.isPending}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const { hasRole } = usePlatformAuth()
  const canWrite = hasRole('ADMIN')

  const tenantQ = useQuery<TenantDetail>({
    queryKey: ['platform', 'tenant', id],
    queryFn: async () => {
      const res = await platformApi.tenants.get(id)
      return res.data as TenantDetail
    },
    staleTime: 30_000,
  })

  const tenant = tenantQ.data

  // Key from data so SettingsEditor remounts with fresh state after save
  const editorKey = tenant ? JSON.stringify(tenant.settings) : 'loading'

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-foreground/40">
        <span>Platform</span>
        <ChevronRight size={13} />
        <Link href="/platform/tenants" className="hover:text-[#E85D04] transition-colors">Tenants</Link>
        <ChevronRight size={13} />
        {tenantQ.isLoading ? (
          <div className="h-3.5 w-32 animate-pulse rounded bg-foreground/8" />
        ) : (
          <Link href={`/platform/tenants/${id}`} className="hover:text-[#E85D04] transition-colors">
            {tenant?.stationName}
          </Link>
        )}
        <ChevronRight size={13} />
        <span className="font-medium text-foreground/70">Settings</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-syne text-2xl font-bold text-foreground">Tenant Settings</h1>
            {tenant && <TenantStatusBadge status={tenant.status} />}
          </div>
          {tenant && (
            <p className="mt-0.5 font-mono text-sm text-foreground/40">{tenant.stationCode} · {tenant.stationName}</p>
          )}
        </div>
        <Link
          href={`/platform/tenants/${id}`}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Tenant
        </Link>
      </div>

      {/* Loading */}
      {tenantQ.isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, gi) => (
            <div key={gi} className="animate-pulse rounded-xl border border-border bg-card p-6">
              <div className="mb-4 h-3 w-24 rounded bg-foreground/8" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/30 py-3 last:border-0">
                  <div className="h-4 w-44 rounded bg-foreground/8" />
                  <div className="h-6 w-11 rounded-full bg-foreground/8" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : tenant?.settings ? (
        <SettingsEditor
          key={editorKey}
          tenantId={id}
          settings={tenant.settings}
          canWrite={canWrite}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', id] })}
        />
      ) : null}
    </div>
  )
}
