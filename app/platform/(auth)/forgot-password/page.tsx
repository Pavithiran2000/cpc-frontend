'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})
type FormValues = z.infer<typeof schema>

export default function PlatformForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await platformApi.auth.forgotPassword(data.email)
      setSent(true)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  if (sent) {
    return (
      <>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle size={22} className="text-emerald-600" />
        </div>
        <h1 className="font-syne text-lg font-bold text-foreground">Check your email</h1>
        <p className="mt-2 text-sm text-foreground/50">
          If that email address is registered, you will receive a password reset link shortly.
        </p>
        <Link
          href="/platform/login"
          className="mt-6 flex items-center gap-1.5 text-sm text-foreground/50 hover:text-[#E85D04]"
        >
          <ArrowLeft size={13} />
          Back to sign in
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-syne text-lg font-bold text-foreground">Reset password</h1>
        <p className="mt-1 text-sm text-foreground/50">
          Enter your email to receive a reset link.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="admin@cpc-platform.local"
            className={[
              'w-full rounded-lg border px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 bg-background',
              errors.email
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-border focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/15',
            ].join(' ')}
          />
          {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
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
            <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Sending…</>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

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
