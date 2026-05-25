'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sun, Moon, Monitor, Lock, Globe, User, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import type { AxiosError } from 'axios'

import { authApi } from '@/lib/api/auth'
import { tenantsApi } from '@/lib/api/tenants'
import { AUTH_KEY } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatDateTime, cn } from '@/lib/utils'

import { PageHeader } from '@/components/shared/PageHeader'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Profile', 'Security', 'Preferences', 'Theme'] as const
type Tab = (typeof TABS)[number]

const TAB_ICONS = {
  Profile:     User,
  Security:    Lock,
  Preferences: Globe,
  Theme:       Monitor,
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card/50 p-1 w-fit max-w-full overflow-x-auto">
      {TABS.map((t) => {
        const Icon = TAB_ICONS[t]
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 sm:px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
              active === t
                ? 'bg-[#E85D04] text-white'
                : 'text-foreground/40 hover:text-foreground/70',
            )}
          >
            <Icon size={13} className="shrink-0" />
            <span className="hidden sm:inline">{t}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground',
    'placeholder:text-foreground/30 outline-none transition-colors',
    hasError ? 'border-rose-500/50' : 'border-input focus:border-[#E85D04]/60',
  ].join(' ')
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-foreground/35">
      {children}
    </p>
  )
}

function SaveButton({
  isPending,
  disabled,
  label = 'Save Changes',
}: {
  isPending: boolean
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Saving…' : label}
    </button>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string
  description?: string
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn('text-sm font-medium', disabled ? 'text-foreground/30' : 'text-foreground')}>
            {label}
          </p>
          {badge && (
            <span className="rounded-full bg-foreground/8 px-2 py-px text-[10px] font-semibold text-foreground/35">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className={cn('text-[11px]', disabled ? 'text-foreground/20' : 'text-foreground/40')}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange?.(!checked)}
        disabled={disabled}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors shrink-0',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          checked && !disabled ? 'bg-[#E85D04]' : 'bg-foreground/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

// ─── TAB 1: Profile ───────────────────────────────────────────────────────────

const profileSchema = z.object({
  name:  z.string().min(1, 'Name is required').max(150),
  phone: z.string().max(30).optional().or(z.literal('')),
})
type ProfileForm = z.infer<typeof profileSchema>

function ProfileTab() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
    useForm<ProfileForm>({
      resolver: zodResolver(profileSchema),
      defaultValues: { name: '', phone: '' },
    })

  useEffect(() => {
    if (user) reset({ name: user.name ?? '', phone: user.phone ?? '' })
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      authApi.updateProfile({ name: data.name, phone: data.phone || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEY })
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  return (
    <div className="flex flex-col gap-4 max-w-lg w-full">
      <SectionCard>
        <SectionTitle>Personal Information</SectionTitle>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
          <Field label="Full Name" error={errors.name?.message}>
            <input
              {...register('name')}
              type="text"
              placeholder="Your name"
              className={inputCls(!!errors.name)}
            />
          </Field>

          <Field label="Email">
            <input
              value={user?.email ?? ''}
              type="email"
              disabled
              className={inputCls() + ' opacity-40 cursor-not-allowed'}
            />
            <p className="text-[10px] text-foreground/30">Email cannot be changed here</p>
          </Field>

          <Field label="Phone" error={errors.phone?.message}>
            <input
              {...register('phone')}
              type="text"
              placeholder="+94 77 123 4567"
              className={inputCls(!!errors.phone)}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/35">
                Role
              </p>
              <span
                className={cn(
                  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                  user?.portal_role === 'ADMIN'
                    ? 'bg-rose-500/15 text-rose-400'
                    : 'bg-sky-500/15 text-sky-400',
                )}
              >
                {user?.portal_role ?? '—'}
              </span>
            </div>

            {user?.last_login_at && (
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/35">
                  Last Sign-in
                </p>
                <p className="font-mono text-xs text-foreground/40">
                  {formatDateTime(user.last_login_at)}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <SaveButton isPending={mutation.isPending} disabled={!isDirty} />
          </div>
        </form>
      </SectionCard>
    </div>
  )
}

// ─── 2FA Setup Sheet ──────────────────────────────────────────────────────────

const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code').regex(/^\d+$/, 'Digits only'),
})
type OtpForm = z.infer<typeof otpSchema>

const disableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code:     z.string().length(6, 'Enter the 6-digit code').regex(/^\d+$/, 'Digits only'),
})
type DisableForm = z.infer<typeof disableSchema>

function Setup2faSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [step, setStep]         = useState<'qr' | 'verify'>('qr')
  const [qrUrl, setQrUrl]       = useState('')
  const [manualKey, setManualKey] = useState('')
  const [copied, setCopied]     = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<OtpForm>({ resolver: zodResolver(otpSchema) })

  const setupMutation = useMutation({
    mutationFn: () => authApi.setup2fa(),
    onSuccess: (res) => {
      setQrUrl(res.data.qr_code_url)
      setManualKey(res.data.manual_entry_key)
      setStep('qr')
    },
    onError: () => toast.error('Failed to start 2FA setup'),
  })

  useEffect(() => {
    if (open) {
      reset()
      setStep('qr')
      setQrUrl('')
      setManualKey('')
      setupMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const activateMutation = useMutation({
    mutationFn: (code: string) => authApi.activate2fa(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEY })
      toast.success('Two-step verification enabled')
      onSuccess()
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const msg = (err as AxiosError<{ message?: string }>)?.response?.data?.message
      toast.error(msg ?? 'Invalid code — please try again')
    },
  })

  function handleCopy() {
    navigator.clipboard.writeText(manualKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#E85D04]" />
            Enable Two-Step Verification
          </SheetTitle>
          <SheetDescription className="text-foreground/40">
            Secure your account with a TOTP authenticator app
          </SheetDescription>
        </SheetHeader>

        {step === 'qr' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground/35">Step 1</p>
              <p className="text-sm text-foreground/70">
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below.
              </p>
            </div>

            {setupMutation.isPending ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-[#E85D04]" />
              </div>
            ) : qrUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border border-border bg-white p-3">
                  <Image src={qrUrl} alt="2FA QR code" width={180} height={180} unoptimized />
                </div>
                <p className="text-[11px] text-foreground/30">Can&apos;t scan? Enter this key manually:</p>
                <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <code className="flex-1 font-mono text-xs text-foreground/60 break-all">{manualKey}</code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 text-foreground/30 transition-colors hover:text-foreground/70"
                  >
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              disabled={!qrUrl}
              onClick={() => setStep('verify')}
              className="w-full rounded-lg bg-[#E85D04] py-2.5 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-40 transition-colors"
            >
              I&apos;ve scanned the code →
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground/35">Step 2</p>
              <p className="text-sm text-foreground/70">
                Enter the 6-digit code shown in your authenticator app to confirm setup.
              </p>
            </div>

            <form onSubmit={handleSubmit((d) => activateMutation.mutate(d.code))} className="flex flex-col gap-4">
              <Field label="Authenticator Code" error={errors.code?.message}>
                <input
                  {...register('code')}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  className={
                    errors.code
                      ? 'w-full rounded-lg border border-rose-500/50 bg-background px-3 py-2.5 text-center font-mono text-xl tracking-[0.4em] text-foreground outline-none'
                      : 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-center font-mono text-xl tracking-[0.4em] text-foreground outline-none focus:border-[#E85D04]/60'
                  }
                />
              </Field>
              <button
                type="submit"
                disabled={isSubmitting || activateMutation.isPending}
                className="w-full rounded-lg bg-[#E85D04] py-2.5 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-40 transition-colors"
              >
                {activateMutation.isPending ? 'Verifying…' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => setStep('qr')}
                className="text-sm text-foreground/35 transition-colors hover:text-foreground/60"
              >
                ← Back
              </button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Disable 2FA Sheet ────────────────────────────────────────────────────────

function Disable2faSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<DisableForm>({ resolver: zodResolver(disableSchema) })

  useEffect(() => { if (open) reset() }, [open, reset])

  const mutation = useMutation({
    mutationFn: (data: DisableForm) => authApi.disable2fa(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEY })
      toast.success('Two-step verification disabled')
      onSuccess()
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const msg = (err as AxiosError<{ message?: string }>)?.response?.data?.message
      toast.error(msg ?? 'Incorrect password or code')
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground flex items-center gap-2">
            <ShieldOff size={16} className="text-rose-400" />
            Disable Two-Step Verification
          </SheetTitle>
          <SheetDescription className="text-foreground/40">
            Confirm with your password and current authenticator code
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
          <Field label="Current Password" error={errors.password?.message}>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className={inputCls(!!errors.password)}
            />
          </Field>
          <Field label="Authenticator Code" error={errors.code?.message}>
            <input
              {...register('code')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className={
                errors.code
                  ? 'w-full rounded-lg border border-rose-500/50 bg-muted/50 px-3 py-2.5 text-center font-mono text-xl tracking-[0.4em] text-foreground outline-none'
                  : 'w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-center font-mono text-xl tracking-[0.4em] text-foreground outline-none focus:border-[#E85D04]/60'
              }
            />
          </Field>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-40 transition-colors"
            >
              {mutation.isPending ? 'Disabling…' : 'Disable Two-Step Verification'}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-lg border border-border py-2.5 text-sm text-foreground/40 transition-colors hover:text-foreground/70"
            >
              Cancel
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── TAB 2: Security ──────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    current_password:  z.string().min(1, 'Current password is required'),
    new_password:      z.string().min(8, 'At least 8 characters'),
    confirm_password:  z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
type PasswordForm = z.infer<typeof passwordSchema>

function SecurityTab() {
  const { user } = useAuth()
  const [setupOpen,   setSetupOpen]   = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const is2faEnabled = user?.two_factor_enabled ?? false

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const mutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      authApi.changePassword({
        current_password: data.current_password,
        new_password:     data.new_password,
      }),
    onSuccess: () => {
      reset()
      toast.success('Password changed')
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Incorrect current password')
    },
  })

  return (
    <div className="flex flex-col gap-4 max-w-lg w-full">
      <SectionCard>
        <SectionTitle>Change Password</SectionTitle>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
          <Field label="Current Password" error={errors.current_password?.message}>
            <input
              {...register('current_password')}
              type="password"
              placeholder="••••••••"
              className={inputCls(!!errors.current_password)}
            />
          </Field>
          <Field label="New Password" error={errors.new_password?.message}>
            <input
              {...register('new_password')}
              type="password"
              placeholder="Min. 8 characters"
              className={inputCls(!!errors.new_password)}
            />
          </Field>
          <Field label="Confirm New Password" error={errors.confirm_password?.message}>
            <input
              {...register('confirm_password')}
              type="password"
              placeholder="••••••••"
              className={inputCls(!!errors.confirm_password)}
            />
          </Field>
          <div className="flex justify-end pt-2">
            <SaveButton isPending={mutation.isPending} label="Change Password" />
          </div>
        </form>
      </SectionCard>

      <SectionCard>
        <SectionTitle>Two-Step Verification</SectionTitle>
        <ToggleRow
          label="Authenticator app"
          description={
            is2faEnabled
              ? 'Two-step verification is active on your account'
              : 'Protect your account with a TOTP authenticator app'
          }
          checked={is2faEnabled}
          onChange={(next) => {
            if (next) setSetupOpen(true)
            else setDisableOpen(true)
          }}
        />
        {is2faEnabled && (
          <p className="mt-2 text-[10px] text-emerald-400/70 flex items-center gap-1">
            <ShieldCheck size={11} />
            Your account is protected with two-step verification
          </p>
        )}
      </SectionCard>

      <Setup2faSheet
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSuccess={() => {}}
      />
      <Disable2faSheet
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onSuccess={() => {}}
      />
    </div>
  )
}

// ─── TAB 3: Preferences ───────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'Asia/Colombo',     label: 'Colombo (UTC+5:30)' },
  { value: 'Asia/Kolkata',     label: 'Mumbai / Delhi (UTC+5:30)' },
  { value: 'Asia/Dubai',       label: 'Dubai (UTC+4)' },
  { value: 'Asia/Singapore',   label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo',       label: 'Tokyo (UTC+9)' },
  { value: 'Europe/London',    label: 'London (UTC+0/+1)' },
  { value: 'America/New_York', label: 'New York (UTC−5/−4)' },
  { value: 'UTC',              label: 'UTC (UTC+0)' },
]

const LS_NOTIF_SHIFT   = 'cpc_notif_shift'
const LS_NOTIF_STOCK   = 'cpc_notif_stock'
const LS_NOTIF_SUMMARY = 'cpc_notif_summary'

function PreferencesTab() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantsApi.getCurrentSettings().then((r) => r.data),
  })
  const settings = settingsQuery.data

  const [timezone, setTimezone] = useState('Asia/Colombo')
  useEffect(() => {
    if (settings?.timezone) setTimezone(settings.timezone)
  }, [settings])

  const [notifShift,   setNotifShift]   = useState(false)
  const [notifStock,   setNotifStock]   = useState(false)
  const [notifSummary, setNotifSummary] = useState(false)
  useEffect(() => {
    setNotifShift(localStorage.getItem(LS_NOTIF_SHIFT)   === 'true')
    setNotifStock(localStorage.getItem(LS_NOTIF_STOCK)   === 'true')
    setNotifSummary(localStorage.getItem(LS_NOTIF_SUMMARY) === 'true')
  }, [])

  const tzMutation = useMutation({
    mutationFn: (tz: string) =>
      tenantsApi.updateCurrentSettings({ timezone: tz }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      toast.success('Timezone saved')
    },
    onError: () => toast.error('Failed to save timezone'),
  })

  function handleNotifToggle(
    key: string,
    setter: (v: boolean) => void,
    next: boolean,
  ) {
    setter(next)
    localStorage.setItem(key, String(next))
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg w-full">
      <SectionCard>
        <SectionTitle>Language</SectionTitle>
        <div className="flex flex-col gap-2">
          {[
            { code: 'en', label: 'English', enabled: true },
            { code: 'si', label: 'සිංහල',  enabled: false },
            { code: 'ta', label: 'தமிழ்',  enabled: false },
          ].map(({ code, label, enabled }) => (
            <label
              key={code}
              className={cn(
                'flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                code === 'en'
                  ? 'border-[#E85D04]/40 bg-[#E85D04]/8'
                  : 'border-border bg-foreground/[0.02] opacity-45 cursor-not-allowed',
              )}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="language"
                  value={code}
                  defaultChecked={code === 'en'}
                  disabled={!enabled}
                  className="accent-[#E85D04]"
                />
                <span className={cn('text-sm', enabled ? 'text-foreground' : 'text-foreground/40')}>
                  {label}
                </span>
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
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[#E85D04]/60 cursor-pointer"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value} className="bg-card">
                {tz.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => tzMutation.mutate(timezone)}
              disabled={tzMutation.isPending || settings?.timezone === timezone}
              className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-50 transition-colors"
            >
              {tzMutation.isPending ? 'Saving…' : 'Save Timezone'}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle>Notifications</SectionTitle>
        <ToggleRow
          label="Shift alerts"
          description="Notify when a shift session is opened or closed"
          checked={notifShift}
          onChange={(v) => handleNotifToggle(LS_NOTIF_SHIFT, setNotifShift, v)}
        />
        <ToggleRow
          label="Low stock alerts"
          description="Notify when product stock falls below threshold"
          checked={notifStock}
          onChange={(v) => handleNotifToggle(LS_NOTIF_STOCK, setNotifStock, v)}
        />
        <ToggleRow
          label="Daily summary"
          description="Receive a daily balance summary at end of business"
          checked={notifSummary}
          onChange={(v) => handleNotifToggle(LS_NOTIF_SUMMARY, setNotifSummary, v)}
        />
        <p className="mt-3 text-[10px] text-foreground/25">
          Notification preferences are saved locally on this device.
        </p>
      </SectionCard>
    </div>
  )
}

// ─── TAB 4: Theme ─────────────────────────────────────────────────────────────

const THEME_OPTIONS = [
  { value: 'light'  as const, label: 'Light',  Icon: Sun     },
  { value: 'dark'   as const, label: 'Dark',   Icon: Moon    },
  { value: 'system' as const, label: 'System', Icon: Monitor },
]

function ThemeTab() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex flex-col gap-4 max-w-lg w-full">
      <SectionCard>
        <SectionTitle>Appearance</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const active = mounted && theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-xl border p-4 transition-all',
                  active
                    ? 'border-[#E85D04] bg-[#E85D04]/8 text-[#E85D04]'
                    : 'border-border bg-foreground/[0.02] text-foreground/40 hover:border-border/80 hover:text-foreground/65',
                )}
              >
                <Icon size={22} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-[10px] text-foreground/25">
          System follows your OS preference and updates automatically.
        </p>
      </SectionCard>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Profile')

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5">
      <PageHeader
        title="Settings"
        description="Manage your account, security, and preferences"
      />
      <TabBar active={tab} onChange={setTab} />

      {tab === 'Profile'     && <ProfileTab />}
      {tab === 'Security'    && <SecurityTab />}
      {tab === 'Preferences' && <PreferencesTab />}
      {tab === 'Theme'       && <ThemeTab />}
    </div>
  )
}
