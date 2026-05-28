'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, ShieldCheck, ShieldOff, Copy, Check, AlertCircle, X,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage =
  | 'idle'
  | 'setup_loading'
  | 'setup'
  | 'activating'
  | 'backup_codes'
  | 'disable_modal'

interface SetupData {
  qrCodeUrl?: string
  secret?: string
  backupCodes?: string[]
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const totpCodeSchema = z.object({
  totp_code: z.string().length(6, 'Enter 6-digit code').regex(/^\d{6}$/, 'Digits only'),
})
type TotpCodeValues = z.infer<typeof totpCodeSchema>

const disableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().min(1, 'Code is required'),
})
type DisableValues = z.infer<typeof disableSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fieldCls = (hasError?: boolean) =>
  [
    'w-full rounded-lg border px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 bg-background',
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
      : 'border-border focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/15',
  ].join(' ')

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-foreground/50'

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="rounded p-1.5 text-foreground/40 hover:bg-foreground/8 hover:text-foreground/70 transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  )
}

// ─── Setup flow ───────────────────────────────────────────────────────────────

function SetupView({
  setupData,
  onSuccess,
  onCancel,
}: {
  setupData: SetupData
  onSuccess: (backupCodes: string[]) => void
  onCancel: () => void
}) {
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TotpCodeValues>({
    resolver: zodResolver(totpCodeSchema),
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      const res = await platformApi.mfa.activateTotp(data)
      const codes: string[] = (res.data as { backupCodes?: string[] })?.backupCodes ?? []
      onSuccess(codes)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E85D04]/10">
          <ShieldCheck size={18} className="text-[#E85D04]" />
        </div>
        <div>
          <p className="font-syne font-semibold text-foreground">Scan QR Code</p>
          <p className="text-xs text-foreground/50">Use your authenticator app to scan</p>
        </div>
      </div>

      {setupData.qrCodeUrl && (
        <div className="flex justify-center">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            {setupData.qrCodeUrl.startsWith('data:') || setupData.qrCodeUrl.startsWith('http') ? (
              <Image
                src={setupData.qrCodeUrl}
                alt="QR Code"
                width={180}
                height={180}
                unoptimized
              />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded bg-foreground/5 text-xs text-foreground/40">
                QR code unavailable
              </div>
            )}
          </div>
        </div>
      )}

      {setupData.secret && (
        <div>
          <p className={`${labelCls} mb-1`}>Manual Entry Key</p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-foreground/5 px-3 py-2">
            <span className="flex-1 break-all font-mono text-sm text-foreground tracking-wider">{setupData.secret}</span>
            <CopyButton text={setupData.secret} />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>6-Digit Verification Code</label>
          <input
            {...register('totp_code')}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className={`${fieldCls(!!errors.totp_code)} font-mono tracking-widest text-center text-lg`}
          />
          {errors.totp_code && <p className="text-xs text-rose-500">{errors.totp_code.message}</p>}
        </div>

        {apiError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
            <p className="text-sm text-rose-600">{apiError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2.5 font-syne font-semibold text-sm text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
          >
            {isSubmitting ? <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Verifying…</> : 'Activate 2FA'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Backup codes view ────────────────────────────────────────────────────────

function BackupCodesView({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyAll = async () => {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
          <ShieldCheck size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="font-syne font-semibold text-foreground">2FA Enabled!</p>
          <p className="text-xs text-foreground/50">Save your backup codes — you won&apos;t see them again</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        Store these codes somewhere safe. Each code can only be used once to sign in if you lose access to your authenticator.
      </div>

      <div className="rounded-lg border border-border bg-foreground/5 p-4">
        <div className="grid grid-cols-2 gap-2">
          {codes.length > 0 ? codes.map((code, i) => (
            <span key={i} className="font-mono text-sm text-foreground tracking-wider">{code}</span>
          )) : (
            <span className="col-span-2 text-sm text-foreground/40">No backup codes returned</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy All'}
        </button>
        <button
          onClick={onDone}
          className="flex-1 rounded-lg bg-[#E85D04] px-4 py-2 font-syne font-semibold text-sm text-white hover:bg-[#c94e03] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ─── Disable modal ────────────────────────────────────────────────────────────

function DisableModal({
  open,
  onClose,
  onDisabled,
}: {
  open: boolean
  onClose: () => void
  onDisabled: () => void
}) {
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DisableValues>({
    resolver: zodResolver(disableSchema),
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await platformApi.mfa.disableTotp(data)
      reset()
      onDisabled()
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  const handleClose = () => { reset(); setApiError(null); onClose() }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">Disable 2FA</h2>
          <button onClick={handleClose} className="rounded p-1 text-foreground/40 hover:bg-foreground/8 hover:text-foreground/70 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-foreground/60">
            Enter your password and current TOTP code (or a backup code) to disable two-factor authentication.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Password</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={fieldCls(!!errors.password)}
            />
            {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>TOTP Code or Backup Code</label>
            <input
              {...register('code')}
              type="text"
              inputMode="numeric"
              placeholder="123456 or backup code"
              className={`${fieldCls(!!errors.code)} font-mono`}
            />
            {errors.code && <p className="text-xs text-rose-500">{errors.code.message}</p>}
          </div>

          {apiError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-600">{apiError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Disabling…</> : 'Disable 2FA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformMfaPage() {
  const { admin, refreshAdmin } = usePlatformAuth()
  const [stage, setStage] = useState<Stage>('idle')
  const [setupData, setSetupData] = useState<SetupData>({})
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [setupError, setSetupError] = useState<string | null>(null)
  const [disableOpen, setDisableOpen] = useState(false)

  const enabled = admin?.twoFactorEnabled

  const startSetup = async () => {
    setSetupError(null)
    setStage('setup_loading')
    try {
      const res = await platformApi.mfa.setupTotp()
      const data = res.data as { qrCodeUrl?: string; secret?: string; backupCodes?: string[] }
      setSetupData({ qrCodeUrl: data.qrCodeUrl, secret: data.secret })
      setStage('setup')
    } catch (err) {
      setSetupError(extractPlatformError(err))
      setStage('idle')
    }
  }

  const handleActivated = async (codes: string[]) => {
    setBackupCodes(codes)
    setStage('backup_codes')
    await refreshAdmin()
  }

  const handleDone = () => {
    setStage('idle')
    setSetupData({})
    setBackupCodes([])
  }

  const handleDisabled = async () => {
    setDisableOpen(false)
    await refreshAdmin()
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/platform/profile" className="text-foreground/40 hover:text-foreground/70 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Two-Factor Authentication</h1>
          <p className="mt-0.5 text-sm text-foreground/50">Secure your account with 2FA</p>
        </div>
      </div>

      {/* Status card (always visible unless in active setup) */}
      {stage === 'idle' && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${enabled ? 'bg-emerald-500/10' : 'bg-foreground/8'}`}>
              {enabled
                ? <ShieldCheck size={22} className="text-emerald-600" />
                : <ShieldOff size={22} className="text-foreground/40" />
              }
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {enabled ? '2FA is enabled' : '2FA is not enabled'}
              </p>
              <p className="text-sm text-foreground/50">
                {enabled
                  ? `Method: ${admin?.mfaMethod ?? 'TOTP'}`
                  : 'Use an authenticator app to generate one-time codes'
                }
              </p>
            </div>
          </div>

          {setupError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-600">{setupError}</p>
            </div>
          )}

          {!enabled ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground/60">
                Set up two-factor authentication using an authenticator app (Google Authenticator, Authy, etc.) to generate one-time codes.
              </p>
              <button
                onClick={startSetup}
                className="w-full rounded-lg bg-[#E85D04] px-4 py-2.5 font-syne font-semibold text-sm text-white hover:bg-[#c94e03] transition-colors"
              >
                Set up Authenticator App
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDisableOpen(true)}
              className="w-full rounded-lg border border-rose-500/25 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors"
            >
              Disable 2FA
            </button>
          )}
        </div>
      )}

      {/* Setup loading */}
      {stage === 'setup_loading' && (
        <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center gap-3">
          <LoadingSpinner size="md" />
          <p className="text-sm text-foreground/50">Generating QR code…</p>
        </div>
      )}

      {/* Setup form */}
      {stage === 'setup' && (
        <SetupView
          setupData={setupData}
          onSuccess={handleActivated}
          onCancel={handleDone}
        />
      )}

      {/* Backup codes */}
      {stage === 'backup_codes' && (
        <BackupCodesView codes={backupCodes} onDone={handleDone} />
      )}

      {/* Disable modal */}
      <DisableModal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onDisabled={handleDisabled}
      />
    </div>
  )
}
