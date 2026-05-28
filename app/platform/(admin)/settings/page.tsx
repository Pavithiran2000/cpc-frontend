'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  User, Lock, Settings, Sun, Moon, Monitor, Globe,
  Edit2, AlertCircle, CheckCircle, Check, X, ShieldCheck, ShieldOff,
  LogOut, Laptop, Save, Copy,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { useTheme, type Theme } from '@/providers/ThemeProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { PlatformSettings, AdminSession } from '@/lib/platform-types'

// ─── Shared styles ────────────────────────────────────────────────────────────

const fieldCls = (hasError?: boolean) =>
  [
    'w-full rounded-lg border px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 bg-background',
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
      : 'border-border focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/15',
  ].join(' ')

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-foreground/50'

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">{children}</div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-foreground/35">
      {children}
    </p>
  )
}

// ─── Password strength ────────────────────────────────────────────────────────

const pwChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {pwChecks.map(({ label, test }) => {
        const ok = test(value)
        return (
          <li key={label} className="flex items-center gap-1.5">
            {ok ? <Check size={11} className="shrink-0 text-emerald-500" /> : <X size={11} className="shrink-0 text-foreground/25" />}
            <span className={`text-xs ${ok ? 'text-emerald-600' : 'text-foreground/40'}`}>{label}</span>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground/80">{label}</p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none disabled:opacity-40 ${checked ? 'bg-[#E85D04]' : 'bg-foreground/15'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

// ─── Profile schemas ──────────────────────────────────────────────────────────

const profileSchema = z.object({ name: z.string().min(1, 'Name is required').max(255) })
type ProfileValues = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Minimum 8 characters'),
  confirm_password: z.string().min(8, 'Minimum 8 characters'),
}).refine((d) => d.new_password === d.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })
type PasswordValues = z.infer<typeof passwordSchema>

// ─── TAB: Profile ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const { admin, refreshAdmin } = usePlatformAuth()
  const [editing, setEditing] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: admin?.name ?? '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await platformApi.auth.updateProfile(data)
      await refreshAdmin()
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  const cancelEdit = () => { reset({ name: admin?.name ?? '' }); setApiError(null); setEditing(false) }

  const avatarLetters = (admin?.name ?? admin?.email ?? '??')
    .split(/[\s@._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle>Account Info</SectionTitle>
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E85D04]/15 font-syne text-lg font-bold text-[#E85D04]">
            {avatarLetters}
          </div>
          <div>
            <p className="font-syne text-lg font-bold text-foreground">{admin?.name}</p>
            <p className="text-sm text-foreground/50">{admin?.email}</p>
          </div>
          {!editing && (
            <button
              onClick={() => { reset({ name: admin?.name ?? '' }); setEditing(true) }}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Full Name</label>
              <input {...register('name')} type="text" className={fieldCls(!!errors.name)} />
              {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </div>
            {apiError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-sm text-rose-600">{apiError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60">
                {isSubmitting ? <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Email', value: admin?.email },
              { label: 'Status', value: admin?.status },
              { label: 'Last Login', value: formatDateTime(admin?.lastLoginAt) },
              { label: 'Member Since', value: formatDateTime(admin?.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className={labelCls}>{label}</p>
                <p className="mt-1 text-sm text-foreground font-mono">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        )}

        {saved && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600">
            <CheckCircle size={14} /> Profile updated successfully
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── TAB: Security ────────────────────────────────────────────────────────────

function SecurityTab() {
  const { admin, refreshAdmin } = usePlatformAuth()
  const queryClient = useQueryClient()
  const [apiError, setApiError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  })
  const newPw = useWatch({ control, name: 'new_password', defaultValue: '' })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await platformApi.auth.changePassword(data)
      setSaved(true)
      reset()
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  // ── Sessions ──
  const sessionsQ = useQuery<AdminSession[]>({
    queryKey: ['platform', 'auth', 'sessions'],
    queryFn: async () => {
      const res = await platformApi.auth.getSessions()
      const d = res.data as { sessions?: AdminSession[] } | AdminSession[]
      return Array.isArray(d) ? d : (d.sessions ?? [])
    },
    staleTime: 30_000,
  })

  const revokeMut = useMutation({
    mutationFn: (sessionId: string) => platformApi.auth.revokeSession(sessionId),
    onSuccess: () => { toast.success('Session revoked'); queryClient.invalidateQueries({ queryKey: ['platform', 'auth', 'sessions'] }) },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const revokeAllMut = useMutation({
    mutationFn: () => platformApi.auth.revokeAllSessions(),
    onSuccess: () => { toast.success('All other sessions revoked'); queryClient.invalidateQueries({ queryKey: ['platform', 'auth', 'sessions'] }) },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  // ── MFA ──
  type MfaMode = null | 'setup' | 'setup-backup' | 'disable'
  const [mfaMode, setMfaMode] = useState<MfaMode>(null)
  const [totpSetupData, setTotpSetupData] = useState<{ qrCodeDataUrl?: string; secretDisplay?: string } | null>(null)
  const [totpActivateCode, setTotpActivateCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [backupCodesConfirmed, setBackupCodesConfirmed] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [mfaErr, setMfaErr] = useState('')

  const setupTotpMut = useMutation({
    mutationFn: () => platformApi.mfa.setupTotp(),
    onSuccess: (res) => {
      const d = res.data as { qrCodeDataUrl?: string; secretDisplay?: string }
      setTotpSetupData(d)
      setMfaMode('setup')
      setMfaErr('')
    },
    onError: (err) => setMfaErr(extractPlatformError(err)),
  })

  const activateTotpMut = useMutation({
    mutationFn: () => platformApi.mfa.activateTotp({ totp_code: totpActivateCode }),
    onSuccess: (res) => {
      const d = res.data as { backupCodes?: string[] }
      setBackupCodes(d.backupCodes ?? [])
      setMfaMode('setup-backup')
      setMfaErr('')
    },
    onError: (err) => setMfaErr(extractPlatformError(err)),
  })

  const disableTotpMut = useMutation({
    mutationFn: () => platformApi.mfa.disableTotp({ code: disableCode, password: disablePassword }),
    onSuccess: async () => {
      toast.success('2FA disabled')
      await refreshAdmin()
      setMfaMode(null)
      setDisableCode('')
      setDisablePassword('')
      setMfaErr('')
    },
    onError: (err) => setMfaErr(extractPlatformError(err)),
  })

  function resetMfaState() {
    setMfaMode(null)
    setTotpSetupData(null)
    setTotpActivateCode('')
    setBackupCodes([])
    setBackupCodesConfirmed(false)
    setDisableCode('')
    setDisablePassword('')
    setMfaErr('')
  }

  async function completeMfaSetup() {
    await refreshAdmin()
    resetMfaState()
    toast.success('Two-factor authentication enabled')
  }

  const sessions = sessionsQ.data ?? []
  const mfaEnabled = admin?.twoFactorEnabled

  return (
    <div className="space-y-4">
      {/* Change Password */}
      <SectionCard>
        <SectionTitle>Change Password</SectionTitle>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Current Password</label>
            <input {...register('current_password')} type="password" autoComplete="current-password" placeholder="••••••••" className={fieldCls(!!errors.current_password)} />
            {errors.current_password && <p className="text-xs text-rose-500">{errors.current_password.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>New Password</label>
            <input {...register('new_password')} type="password" autoComplete="new-password" placeholder="••••••••" className={fieldCls(!!errors.new_password)} />
            {errors.new_password && <p className="text-xs text-rose-500">{errors.new_password.message}</p>}
            <PasswordStrength value={newPw} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Confirm New Password</label>
            <input {...register('confirm_password')} type="password" autoComplete="new-password" placeholder="••••••••" className={fieldCls(!!errors.confirm_password)} />
            {errors.confirm_password && <p className="text-xs text-rose-500">{errors.confirm_password.message}</p>}
          </div>
          {apiError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-600">{apiError}</p>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600">
              <CheckCircle size={14} /> Password changed successfully
            </div>
          )}
          <button type="submit" disabled={isSubmitting} className="flex h-10 w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-[#E85D04] font-syne font-semibold text-sm text-white transition-colors hover:bg-[#c94e03] disabled:opacity-60">
            {isSubmitting ? <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Updating…</> : 'Update Password'}
          </button>
        </form>
      </SectionCard>

      {/* Two-Factor Auth */}
      <SectionCard>
        <SectionTitle>Two-Factor Authentication</SectionTitle>
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${mfaEnabled ? 'bg-emerald-500/10' : 'bg-foreground/8'}`}>
            {mfaEnabled ? <ShieldCheck size={20} className="text-emerald-600" /> : <ShieldOff size={20} className="text-foreground/40" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{mfaEnabled ? '2FA is enabled' : '2FA is not enabled'}</p>
            <p className="text-xs text-foreground/50">
              {mfaEnabled ? `Method: ${admin?.mfaMethod ?? 'TOTP'}` : 'Add an extra layer of security to your account'}
            </p>
          </div>
          {mfaMode === null && (
            <button
              onClick={() => {
                setMfaErr('')
                if (mfaEnabled) { setMfaMode('disable') } else { setupTotpMut.mutate() }
              }}
              disabled={setupTotpMut.isPending}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${mfaEnabled ? 'border border-border text-foreground/70 hover:bg-foreground/5' : 'bg-[#E85D04] text-white hover:bg-[#c94e03]'}`}
            >
              {setupTotpMut.isPending ? 'Loading…' : mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          )}
        </div>

        {/* TOTP setup — show QR */}
        {mfaMode === 'setup' && totpSetupData && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground">Scan QR code with your authenticator app</p>
            {totpSetupData.qrCodeDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={totpSetupData.qrCodeDataUrl} alt="TOTP QR code" className="h-40 w-40 rounded-lg border border-border" />
            )}
            {totpSetupData.secretDisplay && (
              <div>
                <p className="mb-1 text-xs text-foreground/50">Or enter manually:</p>
                <code className="rounded bg-foreground/8 px-2 py-1 font-mono text-xs text-foreground">{totpSetupData.secretDisplay}</code>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Enter code from app</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpActivateCode}
                onChange={(e) => { setTotpActivateCode(e.target.value.replace(/\D/g, '')); setMfaErr('') }}
                className={fieldCls(!!mfaErr)}
                placeholder="123456"
              />
              {mfaErr && <p className="text-xs text-rose-500">{mfaErr}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={resetMfaState} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => activateTotpMut.mutate()}
                disabled={totpActivateCode.length < 6 || activateTotpMut.isPending}
                className="flex items-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
              >
                {activateTotpMut.isPending ? 'Verifying…' : 'Activate 2FA'}
              </button>
            </div>
          </div>
        )}

        {/* TOTP setup — backup codes */}
        {mfaMode === 'setup-backup' && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <ShieldCheck size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Save your backup codes</p>
                <p className="mt-0.5 text-xs text-foreground/50">
                  Store these somewhere safe. Each code can only be used once if you lose access to your authenticator.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-foreground/3 p-4">
              {backupCodes.map((code) => (
                <code key={code} className="font-mono text-sm text-foreground/80 tracking-widest">{code}</code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(backupCodes.join('\n')); toast.success('Backup codes copied') }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/60 hover:bg-foreground/5 transition-colors"
            >
              <Copy size={12} /> Copy all codes
            </button>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={backupCodesConfirmed}
                onChange={(e) => setBackupCodesConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-[#E85D04]"
              />
              <span className="text-sm text-foreground/70">I have saved my backup codes in a safe place</span>
            </label>
            <button
              onClick={completeMfaSetup}
              disabled={!backupCodesConfirmed}
              className="flex items-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
            >
              <ShieldCheck size={14} /> Done — 2FA is active
            </button>
          </div>
        )}

        {/* Disable flow */}
        {mfaMode === 'disable' && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <p className="text-sm text-foreground/60">Enter your authenticator code and current password to disable 2FA.</p>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Authenticator code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => { setDisableCode(e.target.value.replace(/\D/g, '')); setMfaErr('') }}
                className={fieldCls(!!mfaErr)}
                placeholder="123456"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Current password</label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => { setDisablePassword(e.target.value); setMfaErr('') }}
                className={fieldCls(!!mfaErr)}
                placeholder="••••••••"
              />
              {mfaErr && <p className="text-xs text-rose-500">{mfaErr}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={resetMfaState} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => disableTotpMut.mutate()}
                disabled={!disableCode || !disablePassword || disableTotpMut.isPending}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {disableTotpMut.isPending ? 'Disabling…' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Active Sessions */}
      <SectionCard>
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>Active Sessions</SectionTitle>
          {sessions.length > 1 && (
            <button
              onClick={() => revokeAllMut.mutate()}
              disabled={revokeAllMut.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/25 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
            >
              <LogOut size={13} /> Sign out other sessions
            </button>
          )}
        </div>
        {sessionsQ.isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg border border-border/30 bg-foreground/5" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Laptop size={20} className="mb-2 text-foreground/25" />
            <p className="text-sm text-foreground/40">No active sessions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, i) => {
              const ua = session.userAgent ?? ''
              const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] ?? 'Unknown browser'
              return (
                <div key={session.id} className="flex items-center gap-3 rounded-lg border border-border/30 bg-foreground/3 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                    <Laptop size={14} className="text-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {browser}
                      {i === 0 && (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">Current</span>
                      )}
                    </p>
                    <p className="text-xs text-foreground/40">
                      {session.ipAddress ?? 'Unknown IP'}
                      {session.createdAt && <> · {formatRelativeTime(session.createdAt)}</>}
                    </p>
                  </div>
                  {i !== 0 && (
                    <button
                      onClick={() => revokeMut.mutate(session.id)}
                      disabled={revokeMut.isPending}
                      className="shrink-0 rounded p-1.5 text-foreground/40 hover:bg-rose-500/10 hover:text-rose-600 transition-colors disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── TAB: Platform (SUPER_ADMIN only) ────────────────────────────────────────

function PlatformTab() {
  const [local, setLocal] = useState<Partial<PlatformSettings>>({})
  const [dirty, setDirty] = useState(false)

  const settingsQ = useQuery<PlatformSettings>({
    queryKey: ['platform', 'settings'],
    queryFn: () => platformApi.settings.get().then((r) => r.data as PlatformSettings),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (settingsQ.data) { setLocal(settingsQ.data); setDirty(false) }
  }, [settingsQ.data])

  const updateMut = useMutation({
    mutationFn: () => platformApi.settings.update(local as Record<string, unknown>),
    onSuccess: () => { toast.success('Settings saved'); setDirty(false) },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  if (settingsQ.isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    )
  }

  if (settingsQ.isError) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-6 text-center">
        <Settings size={28} className="mx-auto mb-3 text-amber-400" />
        <p className="text-sm font-semibold text-foreground/80">Coming Soon</p>
        <p className="mt-1 text-xs text-foreground/50">Platform-level settings will be available in a future update.</p>
        <button onClick={() => settingsQ.refetch()} className="mt-3 text-xs text-foreground/40 hover:text-foreground/60 hover:underline">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle>Access &amp; Registration</SectionTitle>
        <div className="divide-y divide-border">
          <ToggleRow label="Registration Enabled" description="Allow new tenants to submit registration requests" checked={local.registration_enabled ?? true} onChange={(v) => set('registration_enabled', v)} />
          <ToggleRow label="Maintenance Mode" description="Block all logins and show a maintenance message" checked={local.maintenance_mode ?? false} onChange={(v) => set('maintenance_mode', v)} />
          <ToggleRow label="MFA Required" description="Require all platform admins to have MFA enabled" checked={local.mfa_required ?? false} onChange={(v) => set('mfa_required', v)} />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle>Session Settings</SectionTitle>
        <div>
          <label className={`block ${labelCls} mb-1.5`}>Session Timeout (hours)</label>
          <input
            type="number" min={1} max={720}
            value={local.session_timeout_hours ?? 24}
            onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) set('session_timeout_hours', v) }}
            className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-[#E85D04]/50 focus:outline-none"
          />
          <p className="mt-1 text-xs text-foreground/40">Applies to new sessions only</p>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle>Tenant Limits</SectionTitle>
        <div>
          <label className={`block ${labelCls} mb-1.5`}>Maximum Tenants (0 = unlimited)</label>
          <input
            type="number" min={0}
            value={local.max_tenants ?? 0}
            onChange={(e) => { const v = parseInt(e.target.value, 10); set('max_tenants', isNaN(v) || v === 0 ? null : v) }}
            className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-[#E85D04]/50 focus:outline-none"
          />
        </div>
      </SectionCard>

      <div className="flex justify-end gap-3">
        <button onClick={() => { setLocal(settingsQ.data ?? {}); setDirty(false) }} disabled={!dirty} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors disabled:opacity-40">
          Discard
        </button>
        <button onClick={() => updateMut.mutate()} disabled={!dirty || updateMut.isPending} className="flex items-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60">
          <Save size={14} /> {updateMut.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── TAB: Preferences ────────────────────────────────────────────────────────

const PLATFORM_TIMEZONES = [
  { value: 'Asia/Colombo',     label: 'Colombo (UTC+5:30)' },
  { value: 'Asia/Kolkata',     label: 'Mumbai / Delhi (UTC+5:30)' },
  { value: 'Asia/Dubai',       label: 'Dubai (UTC+4)' },
  { value: 'Asia/Singapore',   label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo',       label: 'Tokyo (UTC+9)' },
  { value: 'Europe/London',    label: 'London (UTC+0/+1)' },
  { value: 'America/New_York', label: 'New York (UTC−5/−4)' },
  { value: 'UTC',              label: 'UTC (UTC+0)' },
]

const LS_TZ                 = 'platform_timezone'
const LS_NOTIF_NEW_DEVICE   = 'platform_notif_new_device'
const LS_NOTIF_NEW_ADMIN    = 'platform_notif_new_admin'
const LS_NOTIF_TENANT_STATUS = 'platform_notif_tenant_status'
const LS_NOTIF_WEEKLY       = 'platform_notif_weekly'

function PreferencesTab() {
  const { hasRole } = usePlatformAuth()
  const isSA = hasRole('SUPER_ADMIN')

  const [timezone,          setTimezone]          = useState('Asia/Colombo')
  const [notifNewDevice,    setNotifNewDevice]    = useState(false)
  const [notifNewAdmin,     setNotifNewAdmin]     = useState(false)
  const [notifTenantStatus, setNotifTenantStatus] = useState(false)
  const [notifWeekly,       setNotifWeekly]       = useState(false)

  useEffect(() => {
    setTimezone(localStorage.getItem(LS_TZ) ?? 'Asia/Colombo')
    setNotifNewDevice(localStorage.getItem(LS_NOTIF_NEW_DEVICE) === 'true')
    setNotifNewAdmin(localStorage.getItem(LS_NOTIF_NEW_ADMIN) === 'true')
    setNotifTenantStatus(localStorage.getItem(LS_NOTIF_TENANT_STATUS) === 'true')
    setNotifWeekly(localStorage.getItem(LS_NOTIF_WEEKLY) === 'true')
  }, [])

  function saveTimezone() {
    localStorage.setItem(LS_TZ, timezone)
    toast.success('Timezone saved')
  }

  function toggleNotif(key: string, setter: (v: boolean) => void, val: boolean) {
    setter(val)
    localStorage.setItem(key, String(val))
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle>Language</SectionTitle>
        <div className="flex flex-col gap-2">
          {[
            { code: 'en', label: 'English',  enabled: true  },
            { code: 'si', label: 'සිංහල',   enabled: false },
            { code: 'ta', label: 'தமிழ்',   enabled: false },
          ].map(({ code, label, enabled }) => (
            <label
              key={code}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                code === 'en'
                  ? 'cursor-pointer border-[#E85D04]/40 bg-[#E85D04]/8'
                  : 'cursor-not-allowed border-border bg-foreground/2 opacity-45'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="platform-lang"
                  value={code}
                  defaultChecked={code === 'en'}
                  disabled={!enabled}
                  className="accent-[#E85D04]"
                />
                <span className={`text-sm ${enabled ? 'text-foreground' : 'text-foreground/40'}`}>{label}</span>
              </div>
              {!enabled && (
                <span className="rounded-full bg-foreground/8 px-2 py-px text-[10px] font-semibold text-foreground/30">
                  Coming soon
                </span>
              )}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle>Timezone</SectionTitle>
        <div className="flex flex-col gap-3">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[#E85D04]/50 cursor-pointer"
          >
            {PLATFORM_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value} className="bg-card">
                {tz.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveTimezone}
              className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
            >
              Save Timezone
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle>Notifications</SectionTitle>
        <div className="divide-y divide-border">
          <ToggleRow
            label="Login from new device"
            description="Alert when your account is accessed from a new browser or IP"
            checked={notifNewDevice}
            onChange={(v) => toggleNotif(LS_NOTIF_NEW_DEVICE, setNotifNewDevice, v)}
          />
          {isSA && (
            <ToggleRow
              label="New admin invited"
              description="Notify when a new platform admin is added to the console"
              checked={notifNewAdmin}
              onChange={(v) => toggleNotif(LS_NOTIF_NEW_ADMIN, setNotifNewAdmin, v)}
            />
          )}
          <ToggleRow
            label="Tenant status changed"
            description="Notify when a tenant is suspended, activated, or deactivated"
            checked={notifTenantStatus}
            onChange={(v) => toggleNotif(LS_NOTIF_TENANT_STATUS, setNotifTenantStatus, v)}
          />
          <ToggleRow
            label="Weekly activity summary"
            description="Receive a weekly summary of platform activity"
            checked={notifWeekly}
            onChange={(v) => toggleNotif(LS_NOTIF_WEEKLY, setNotifWeekly, v)}
          />
        </div>
        <p className="mt-3 text-[10px] text-foreground/25">
          Notification preferences are saved locally on this device.
        </p>
      </SectionCard>
    </div>
  )
}

// ─── TAB: Theme ───────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Clean white interface' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follows OS preference' },
]

function ThemeTab() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionTitle>Appearance</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon, description }) => {
            const active = theme === value
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  active
                    ? 'border-[#E85D04] bg-[#E85D04]/8 text-[#E85D04]'
                    : 'border-border text-foreground/50 hover:border-foreground/30 hover:bg-foreground/5'
                }`}
              >
                <Icon size={22} />
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-[#E85D04]' : 'text-foreground/70'}`}>{label}</p>
                  <p className={`text-xs ${active ? 'text-[#E85D04]/70' : 'text-foreground/40'}`}>{description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey = 'profile' | 'security' | 'preferences' | 'platform' | 'theme'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformSettingsPage() {
  const { hasRole, initialized } = usePlatformAuth()
  const isSA = hasRole('SUPER_ADMIN')
  const [activeTab, setActiveTab] = useState<TabKey>('profile')

  const tabs: { key: TabKey; label: string; icon: React.ElementType; saOnly?: boolean }[] = [
    { key: 'profile',     label: 'Profile',     icon: User    },
    { key: 'security',    label: 'Security',    icon: Lock    },
    { key: 'preferences', label: 'Preferences', icon: Globe   },
    { key: 'platform',    label: 'Platform',    icon: Settings, saOnly: true },
    { key: 'theme',       label: 'Theme',       icon: Monitor },
  ]

  const visibleTabs = tabs.filter((t) => !t.saOnly || isSA)

  if (!initialized) return null

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-syne text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground/50">Manage your account and platform preferences</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card/50 p-1 w-fit max-w-full overflow-x-auto">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-[#E85D04] text-white'
                : 'text-foreground/60 hover:text-foreground/80'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile'     && <ProfileTab />}
      {activeTab === 'security'    && <SecurityTab />}
      {activeTab === 'preferences' && <PreferencesTab />}
      {activeTab === 'platform'    && isSA && <PlatformTab />}
      {activeTab === 'theme'       && <ThemeTab />}
    </div>
  )
}
