'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import type { AxiosError } from 'axios'
import { useAuth } from '@/lib/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  station_code: z
    .string()
    .min(2, 'Station code is required')
    .transform((v) => v.toUpperCase()),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Minimum 6 characters'),
})

type FormValues = z.infer<typeof schema>

// ─── Animated fuel ripple ─────────────────────────────────────────────────────

function FuelRipple() {
  const rings = [
    { r: 42,  sw: 1.5, op: 0.15, delay: '0s'    },
    { r: 74,  sw: 1,   op: 0.12, delay: '0.7s'  },
    { r: 108, sw: 1,   op: 0.09, delay: '1.4s'  },
    { r: 140, sw: 0.8, op: 0.07, delay: '2.1s'  },
    { r: 168, sw: 0.5, op: 0.05, delay: '2.8s'  },
  ]

  return (
    <svg viewBox="-190 -190 380 380" className="h-72 w-72" aria-hidden="true">
      <defs>
        <style>{`
          @keyframes cpc-ring-pulse {
            0%, 100% { transform: scale(0.93); }
            50%       { transform: scale(1.06); }
          }
          .cpc-ring {
            transform-box: fill-box;
            transform-origin: center;
            animation: cpc-ring-pulse 4.5s ease-in-out infinite;
            fill: none;
            stroke: #E85D04;
          }
        `}</style>
      </defs>

      {rings.map(({ r, sw, op, delay }) => (
        <circle
          key={r}
          className="cpc-ring"
          cx="0" cy="0"
          r={r}
          strokeWidth={sw}
          opacity={op}
          style={{ animationDelay: delay }}
        />
      ))}

      {/* Centre glow */}
      <circle cx="0" cy="0" r="30" fill="#E85D04" opacity="0.10" />

      {/* Fuel-drop silhouette */}
      <path
        d="M0,-22 C-1.5,-22 -15,-7 -15,5 C-15,13.5 -8.3,20 0,20 C8.3,20 15,13.5 15,5 C15,-7 1.5,-22 0,-22 Z"
        fill="#E85D04"
        opacity="0.45"
      />
    </svg>
  )
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

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

// ─── Input class helper ───────────────────────────────────────────────────────

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

// ─── Login page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError]         = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { station_code: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await login(data.station_code, data.email, data.password)
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string | string[] }>
      const msg = axiosErr.response?.data?.message
      setApiError(
        Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid credentials. Please try again.'),
      )
    }
  })

  return (
    <div className="flex h-screen">
      {/* ── Left panel — always dark ── */}
      <div className="relative hidden w-[45%] flex-col items-center justify-between overflow-hidden bg-[#0A0A0B] py-14 lg:flex">
        {/* Top: logo + tagline */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p
            className="font-syne leading-none text-[#E85D04]"
            style={{ fontSize: '80px', fontWeight: 800 }}
          >
            CPC
          </p>
          <p className="text-sm tracking-wide text-white/35">
            Filling Station Management
          </p>
        </div>

        {/* Centre: animated ripple */}
        <FuelRipple />

        {/* Bottom caption */}
        <p className="text-xs text-white/20">
          Powering Stations Across Sri Lanka
        </p>
      </div>

      {/* ── Right panel — theme-aware ── */}
      <div className="flex w-full flex-col items-center justify-center bg-[#111114] px-6 lg:w-[55%]">
        <div className="w-full max-w-[360px]">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-syne text-[28px] font-bold leading-tight text-white">
              Welcome Back
            </h1>
            <p className="mt-1.5 text-sm text-white/45">
              Sign in to your station account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {/* Station code */}
            <Field label="Station Code" error={errors.station_code?.message}>
              <input
                {...register('station_code')}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="STA-001"
                className={
                  errors.station_code
                    ? inputClsError('number', 'uppercase', 'tracking-widest')
                    : inputCls('number', 'uppercase', 'tracking-widest')
                }
              />
            </Field>

            {/* Email */}
            <Field label="Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                className={errors.email ? inputClsError() : inputCls()}
              />
            </Field>

            {/* Password */}
            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={
                    errors.password ? inputClsError('pr-10') : inputCls('pr-10')
                  }
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            {/* API error */}
            {apiError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/8 px-3.5 py-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-400" />
                <p className="text-sm leading-snug text-rose-400">{apiError}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-[#E85D04] font-syne font-semibold text-white transition-colors hover:bg-[#F48C06] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="border-white/40 border-t-white" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-white/20">CPC © 2025</p>
        </div>
      </div>
    </div>
  )
}
