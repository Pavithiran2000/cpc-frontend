'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react'
import type { AxiosError } from 'axios'
import Link from 'next/link'
import { authApi } from '@/lib/api/auth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const schema = z.object({
  station_code: z
    .string()
    .min(2, 'Station code is required')
    .transform((v) => v.toUpperCase()),
  email: z.string().email('Invalid email address'),
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

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { station_code: '', email: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await authApi.forgotPassword(data.station_code, data.email)
      setSent(true)
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
          {sent ? (
            <>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15">
                <Mail size={22} className="text-emerald-400" />
              </div>
              <h1 className="font-syne text-[28px] font-bold leading-tight text-white">
                Check your inbox
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                If an account exists for that station and email, a reset link has been sent. It
                expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="mt-8 flex items-center gap-1.5 text-sm text-white/35 transition-colors hover:text-white/60"
              >
                <ArrowLeft size={13} />
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-syne text-[28px] font-bold leading-tight text-white">
                  Forgot password?
                </h1>
                <p className="mt-1.5 text-sm text-white/45">
                  Enter your station code and email to receive a reset link.
                </p>
              </div>

              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                <Field label="Station Code" error={errors.station_code?.message}>
                  <input
                    {...register('station_code')}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="STA-001"
                    className={
                      errors.station_code
                        ? inputClsError('font-mono', 'uppercase', 'tracking-widest')
                        : inputCls('font-mono', 'uppercase', 'tracking-widest')
                    }
                  />
                </Field>

                <Field label="Email" error={errors.email?.message}>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    className={errors.email ? inputClsError() : inputCls()}
                  />
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
                      <span>Sending…</span>
                    </>
                  ) : (
                    'Send Reset Link'
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
