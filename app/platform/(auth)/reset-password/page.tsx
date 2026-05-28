'use client'

import { Suspense, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle, Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const schema = z
  .object({
    new_password: z.string().min(8, 'Minimum 8 characters'),
    confirm_password: z.string().min(8, 'Minimum 8 characters'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

// ─── Password strength ────────────────────────────────────────────────────────

const checks = [
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
      {checks.map(({ label, test }) => {
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

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const newPassword = useWatch({ control, name: 'new_password', defaultValue: '' })

  if (!token) {
    return (
      <>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
          <AlertCircle size={22} className="text-rose-600" />
        </div>
        <h1 className="font-syne text-lg font-bold text-foreground">Invalid reset link</h1>
        <p className="mt-2 text-sm text-foreground/50">
          This link is missing a token. It may have expired or been used already.
        </p>
        <Link
          href="/platform/forgot-password"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-4 py-2.5 font-syne text-sm font-semibold text-white hover:bg-[#c94e03]"
        >
          Request a new link
        </Link>
        <Link
          href="/platform/login"
          className="mt-4 flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70"
        >
          <ArrowLeft size={13} />
          Back to sign in
        </Link>
      </>
    )
  }

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await platformApi.auth.resetPassword({ token, ...data })
      setDone(true)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  const fieldCls = (hasError?: boolean) =>
    [
      'w-full rounded-lg border px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 bg-background',
      hasError
        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
        : 'border-border focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/15',
    ].join(' ')

  if (done) {
    return (
      <>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle size={22} className="text-emerald-600" />
        </div>
        <h1 className="font-syne text-lg font-bold text-foreground">Password updated</h1>
        <p className="mt-2 text-sm text-foreground/50">Your password has been changed successfully.</p>
        <Link
          href="/platform/login"
          className="mt-6 inline-block rounded-lg bg-[#E85D04] px-5 py-2.5 font-syne font-semibold text-sm text-white hover:bg-[#c94e03]"
        >
          Sign in
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-syne text-lg font-bold text-foreground">Set new password</h1>
        <p className="mt-1 text-sm text-foreground/50">Choose a strong password of at least 8 characters.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">
            New password
          </label>
          <input
            {...register('new_password')}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={fieldCls(!!errors.new_password)}
          />
          {errors.new_password && (
            <p className="text-xs text-rose-500">{errors.new_password.message}</p>
          )}
          <PasswordStrength value={newPassword} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">
            Confirm password
          </label>
          <input
            {...register('confirm_password')}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={fieldCls(!!errors.confirm_password)}
          />
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
            <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Saving…</>
          ) : (
            'Set new password'
          )}
        </button>
      </form>
    </>
  )
}

export default function PlatformResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded bg-foreground/8" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
