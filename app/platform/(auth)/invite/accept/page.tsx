'use client'

import { Suspense, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle, Check, X, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirm_password: z.string().min(8, 'Minimum 8 characters'),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

// ─── Password strength ────────────────────────────────────────────────────────

const strengthChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter',       test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',       test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number',                 test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character',      test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {strengthChecks.map(({ label, test }) => {
        const ok = test(value)
        return (
          <li key={label} className="flex items-center gap-1.5">
            {ok ? (
              <Check size={12} className="shrink-0 text-emerald-500" />
            ) : (
              <X size={12} className="shrink-0 text-foreground/25" />
            )}
            <span className={`text-xs ${ok ? 'text-emerald-600' : 'text-foreground/40'}`}>
              {label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function fieldCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 bg-background',
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
      : 'border-border focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/15',
  ].join(' ')
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [done, setDone] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' })

  // ── Invalid / missing token ───────────────────────────────────────────────

  if (!token) {
    return (
      <>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
          <AlertCircle size={22} className="text-rose-600" />
        </div>
        <h1 className="font-syne text-lg font-bold text-foreground">Invalid invite link</h1>
        <p className="mt-2 text-sm text-foreground/50">
          This link is missing a token. It may have expired or already been used.
        </p>
        <Link
          href="/platform/login"
          className="mt-6 flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70"
        >
          <ArrowLeft size={13} />
          Back to sign in
        </Link>
      </>
    )
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (done) {
    return (
      <>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle size={22} className="text-emerald-600" />
        </div>
        <h1 className="font-syne text-lg font-bold text-foreground">Account activated</h1>
        <p className="mt-2 text-sm text-foreground/50">
          Your platform admin account is ready. Sign in to get started.
        </p>
        <button
          onClick={() => router.push('/platform/login')}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-[#E85D04] font-syne font-semibold text-white transition-colors hover:bg-[#c94e03]"
        >
          Go to sign in
        </button>
      </>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await platformApi.admins.acceptInvite({ token, ...data })
      toast.success('Account activated — please sign in')
      setDone(true)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  return (
    <>
      <div className="mb-6">
        <h1 className="font-syne text-lg font-bold text-foreground">Accept invitation</h1>
        <p className="mt-1 text-sm text-foreground/50">
          Set your name and a password to activate your admin account.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">
            Full name
          </label>
          <input
            {...register('name')}
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            autoFocus
            className={fieldCls(!!errors.name)}
          />
          {errors.name && (
            <p className="text-xs text-rose-500">{errors.name.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={fieldCls(!!errors.password) + ' pr-10'}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-500">{errors.password.message}</p>
          )}
          <PasswordStrength value={passwordValue} />
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">
            Confirm password
          </label>
          <div className="relative">
            <input
              {...register('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={fieldCls(!!errors.confirm_password) + ' pr-10'}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-rose-500">{errors.confirm_password.message}</p>
          )}
        </div>

        {apiError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
            <p className="text-sm text-rose-600">{apiError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E85D04] font-syne font-semibold text-white transition-colors hover:bg-[#c94e03] disabled:opacity-60"
        >
          {isSubmitting ? (
            <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Activating…</>
          ) : (
            'Activate account'
          )}
        </button>

        <Link
          href="/platform/login"
          className="flex items-center justify-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70"
        >
          <ArrowLeft size={13} />
          Back to sign in
        </Link>
      </form>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformInviteAcceptPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded bg-foreground/8" />}>
      <AcceptInviteForm />
    </Suspense>
  )
}
