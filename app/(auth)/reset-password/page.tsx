'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react'
import type { AxiosError } from 'axios'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const schema = z
  .object({
    new_password: z.string().min(8, 'Minimum 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

function inputCls(...extra: string[]) {
  return [
    'w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white',
    'placeholder:text-white/25 outline-none transition-colors',
    'border-white/10 focus:border-[#E85D04]/60 focus:ring-2 focus:ring-[#E85D04]/15',
    ...extra,
  ].join(' ')
}

function inputClsError(...extra: string[]) {
  return [
    'w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white',
    'placeholder:text-white/25 outline-none transition-colors',
    'border-rose-500/50 focus:border-rose-500/70 focus:ring-2 focus:ring-rose-500/15',
    ...extra,
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
      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111114] px-6">
        <div className="w-full max-w-[360px] text-center">
          <p className="text-sm text-white/45">Invalid or missing reset link.</p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm text-[#E85D04] hover:text-[#F48C06]"
          >
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await authApi.resetPassword(token, data.new_password)
      setDone(true)
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string | string[] }>
      const msg = axiosErr.response?.data?.message
      setApiError(Array.isArray(msg) ? msg[0] : (msg ?? 'Something went wrong. Please try again.'))
    }
  })

  return (
    <div className="flex h-screen">
      {/* Left panel — always dark */}
      <div className="relative hidden w-[45%] flex-col items-center justify-center overflow-hidden bg-[#0A0A0B] lg:flex">
        <div className="flex flex-col items-center gap-3 text-center">
          <p
            className="font-syne leading-none text-[#E85D04]"
            style={{ fontSize: '80px', fontWeight: 800 }}
          >
            CPC
          </p>
          <p className="text-sm tracking-wide text-white/35">Filling Station Management</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col items-center justify-center bg-[#111114] px-6 lg:w-[55%]">
        <div className="w-full max-w-[360px]">
          {done ? (
            <>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15">
                <CheckCircle size={22} className="text-emerald-400" />
              </div>
              <h1 className="font-syne text-[28px] font-bold leading-tight text-white">
                Password updated
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Link
                href="/login"
                className="mt-8 flex h-11 w-full items-center justify-center rounded-lg bg-[#E85D04] font-syne font-semibold text-white transition-colors hover:bg-[#F48C06]"
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-syne text-[28px] font-bold leading-tight text-white">
                  Set new password
                </h1>
                <p className="mt-1.5 text-sm text-white/45">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                <Field label="New Password" error={errors.new_password?.message}>
                  <div className="relative">
                    <input
                      {...register('new_password')}
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className={errors.new_password ? inputClsError('pr-10') : inputCls('pr-10')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm Password" error={errors.confirm_password?.message}>
                  <div className="relative">
                    <input
                      {...register('confirm_password')}
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className={
                        errors.confirm_password ? inputClsError('pr-10') : inputCls('pr-10')
                      }
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>

                {apiError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/8 px-3.5 py-3">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-400" />
                    <p className="text-sm leading-snug text-rose-400">{apiError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-[#E85D04] font-syne font-semibold text-white transition-colors hover:bg-[#F48C06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="border-white/40 border-t-white" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>

              <Link
                href="/login"
                className="mt-8 flex items-center gap-1.5 text-sm text-white/35 transition-colors hover:text-white/60"
              >
                <ArrowLeft size={13} />
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#111114]">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
