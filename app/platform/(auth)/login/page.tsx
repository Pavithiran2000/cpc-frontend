'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { usePlatformAuth, extractPlatformError } from '@/providers/PlatformAuthContext'
import { platformApi } from '@/lib/platform-api'
import type { MfaMethod } from '@/lib/platform-types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Minimum 8 characters'),
})

const codeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Code too long'),
})

type LoginValues = z.infer<typeof loginSchema>
type CodeValues = z.infer<typeof codeSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50"
      >
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
    </div>
  )
}

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2.5 text-sm text-foreground outline-none transition-colors',
    'placeholder:text-foreground/40 bg-background',
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
      : 'border-border focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/15',
  ].join(' ')
}

function ApiError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-3">
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
      <p className="text-sm leading-snug text-rose-600">{message}</p>
    </div>
  )
}

function SubmitButton({
  isSubmitting,
  label,
  loadingLabel,
}: {
  isSubmitting: boolean
  label: string
  loadingLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="mt-1 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-[#E85D04] font-syne font-semibold text-white transition-colors hover:bg-[#c94e03] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? (
        <>
          <LoadingSpinner size="sm" className="border-white/40 border-t-white" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        label
      )}
    </button>
  )
}

// ─── MFA types ────────────────────────────────────────────────────────────────

type MfaTab = 'totp' | 'email' | 'backup'

// ─── Step 1: Credentials ──────────────────────────────────────────────────────

function CredentialsStep({
  onMfaRequired,
  destination,
}: {
  onMfaRequired: (token: string, method: MfaMethod) => void
  destination: string
}) {
  const { login, refreshAdmin } = usePlatformAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      const result = await login(data.email, data.password)
      if (result.requiresMfa) {
        onMfaRequired(result.tempToken, result.mfaMethod)
      } else {
        await refreshAdmin()
        router.push(destination)
      }
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  return (
    <>
      <div className="mb-6">
        <h1 className="font-syne text-xl font-bold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-foreground/50">Enter your platform admin credentials</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Field label="Email" htmlFor="platform-email" error={errors.email?.message}>
          <input
            {...register('email')}
            id="platform-email"
            type="email"
            autoComplete="email"
            placeholder="admin@cpc-platform.local"
            className={inputCls(!!errors.email)}
          />
        </Field>

        <Field label="Password" htmlFor="platform-password" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register('password')}
              id="platform-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls(!!errors.password) + ' pr-10'}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 transition-colors hover:text-foreground/60"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="flex justify-end">
            <Link
              href="/platform/forgot-password"
              className="text-xs text-foreground/40 transition-colors hover:text-[#E85D04]"
            >
              Forgot password?
            </Link>
          </div>
        </Field>

        {apiError && <ApiError message={apiError} />}

        <SubmitButton
          isSubmitting={isSubmitting}
          label="Sign In"
          loadingLabel="Signing in…"
        />
      </form>
    </>
  )
}

// ─── MFA code input ───────────────────────────────────────────────────────────

function CodeInput({
  label,
  placeholder,
  isNumeric,
  onVerify,
  onBack,
  prefix,
}: {
  label: string
  placeholder: string
  isNumeric: boolean
  onVerify: (code: string) => Promise<void>
  onBack?: () => void
  prefix?: React.ReactNode
}) {
  const [apiError, setApiError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await onVerify(data.code)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {prefix}
      <Field label={label} error={errors.code?.message}>
        <input
          {...register('code')}
          type="text"
          inputMode={isNumeric ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          maxLength={isNumeric ? 6 : 20}
          placeholder={placeholder}
          autoFocus
          className={
            inputCls(!!errors.code) +
            (isNumeric ? ' font-mono text-center text-xl tracking-[0.4em]' : '')
          }
        />
      </Field>
      {apiError && <ApiError message={apiError} />}
      <SubmitButton isSubmitting={isSubmitting} label="Verify" loadingLabel="Verifying…" />
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 text-sm text-foreground/40 transition-colors hover:text-foreground/70"
        >
          <ArrowLeft size={13} />
          Back to sign in
        </button>
      )}
    </form>
  )
}

// ─── Step 2: TOTP ─────────────────────────────────────────────────────────────

function TotpStep({
  tempToken,
  onSuccess,
  onBack,
}: {
  tempToken: string
  onSuccess: () => Promise<void>
  onBack: () => void
}) {
  const handleVerify = async (code: string) => {
    await platformApi.mfa.verifyTotpLogin({ temp_token: tempToken, code })
    await onSuccess()
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E85D04]/10">
          <ShieldCheck size={18} className="text-[#E85D04]" />
        </div>
        <div>
          <p className="font-syne font-semibold text-foreground">Authenticator App</p>
          <p className="text-xs text-foreground/50">Enter the 6-digit code</p>
        </div>
      </div>
      <CodeInput
        label="TOTP Code"
        placeholder="000000"
        isNumeric
        onVerify={handleVerify}
        onBack={onBack}
      />
    </>
  )
}

// ─── Step 2: Email OTP ────────────────────────────────────────────────────────

function EmailOtpStep({
  tempToken,
  onSuccess,
  onBack,
}: {
  tempToken: string
  onSuccess: () => Promise<void>
  onBack: () => void
}) {
  const [codeSent, setCodeSent] = useState(false)
  const [sending, setSending] = useState(false)

  const sendCode = async () => {
    setSending(true)
    try {
      await platformApi.mfa.sendEmailOtpLogin({ temp_token: tempToken })
      setCodeSent(true)
      toast.success('Code sent to your email')
    } catch (err) {
      toast.error(extractPlatformError(err))
    } finally {
      setSending(false)
    }
  }

  const handleVerify = async (code: string) => {
    await platformApi.mfa.verifyEmailOtpLogin({ temp_token: tempToken, code })
    await onSuccess()
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E85D04]/10">
          <ShieldCheck size={18} className="text-[#E85D04]" />
        </div>
        <div>
          <p className="font-syne font-semibold text-foreground">Email Verification</p>
          <p className="text-xs text-foreground/50">We&apos;ll send a code to your email</p>
        </div>
      </div>

      {!codeSent ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground/60">
            Click below to receive a verification code at your registered email address.
          </p>
          <button
            onClick={sendCode}
            disabled={sending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E85D04] font-syne font-semibold text-white transition-colors hover:bg-[#c94e03] disabled:opacity-60"
          >
            {sending ? (
              <><LoadingSpinner size="sm" className="border-white/40 border-t-white" /> Sending…</>
            ) : (
              'Send code to email'
            )}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70"
          >
            <ArrowLeft size={13} />
            Back to sign in
          </button>
        </div>
      ) : (
        <CodeInput
          label="Email Code"
          placeholder="000000"
          isNumeric
          onVerify={handleVerify}
          onBack={onBack}
        />
      )}
    </>
  )
}

// ─── Step 2: Backup code ──────────────────────────────────────────────────────

function BackupCodeStep({
  tempToken,
  onSuccess,
  onBack,
}: {
  tempToken: string
  onSuccess: () => Promise<void>
  onBack: () => void
}) {
  const handleVerify = async (code: string) => {
    await platformApi.mfa.verifyBackupLogin({ temp_token: tempToken, code })
    await onSuccess()
  }

  return (
    <>
      <p className="mb-4 text-sm font-medium text-foreground">Backup Code</p>
      <CodeInput
        label="Backup code"
        placeholder="XXXXXXXX"
        isNumeric={false}
        onVerify={handleVerify}
        onBack={onBack}
      />
    </>
  )
}

// ─── Step 2: MFA router (BOTH = tabs) ────────────────────────────────────────

function MfaStep({
  tempToken,
  mfaMethod,
  onSuccess,
  onBack,
}: {
  tempToken: string
  mfaMethod: MfaMethod
  onSuccess: () => Promise<void>
  onBack: () => void
}) {
  const [activeTab, setActiveTab] = useState<MfaTab>('totp')

  if (mfaMethod === 'TOTP') {
    return (
      <TotpStep tempToken={tempToken} onSuccess={onSuccess} onBack={onBack} />
    )
  }

  if (mfaMethod === 'EMAIL') {
    return (
      <EmailOtpStep tempToken={tempToken} onSuccess={onSuccess} onBack={onBack} />
    )
  }

  // BOTH — show tabs
  const tabs: { key: MfaTab; label: string }[] = [
    { key: 'totp', label: 'Authenticator' },
    { key: 'email', label: 'Email Code' },
    { key: 'backup', label: 'Backup Code' },
  ]

  return (
    <>
      <div className="mb-5">
        <p className="mb-3 font-syne font-semibold text-foreground">Two-step verification</p>
        <div className="flex gap-1 rounded-lg bg-foreground/8 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={[
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                activeTab === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-foreground/50 hover:text-foreground/70',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'totp' && (
        <TotpStep tempToken={tempToken} onSuccess={onSuccess} onBack={onBack} />
      )}
      {activeTab === 'email' && (
        <EmailOtpStep tempToken={tempToken} onSuccess={onSuccess} onBack={onBack} />
      )}
      {activeTab === 'backup' && (
        <BackupCodeStep tempToken={tempToken} onSuccess={onSuccess} onBack={onBack} />
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type MfaState = { tempToken: string; mfaMethod: MfaMethod } | null

function LoginContent() {
  const [mfaState, setMfaState] = useState<MfaState>(null)
  const { refreshAdmin } = usePlatformAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawFrom = searchParams.get('from') ?? ''
  const destination =
    rawFrom.startsWith('/platform/') && !rawFrom.startsWith('/platform/login')
      ? rawFrom
      : '/platform/dashboard'

  const handleMfaSuccess = async () => {
    await refreshAdmin()
    router.push(destination)
  }

  return (
    <>
      {mfaState ? (
        <MfaStep
          tempToken={mfaState.tempToken}
          mfaMethod={mfaState.mfaMethod}
          onSuccess={handleMfaSuccess}
          onBack={() => setMfaState(null)}
        />
      ) : (
        <CredentialsStep
          destination={destination}
          onMfaRequired={(tempToken, mfaMethod) =>
            setMfaState({ tempToken, mfaMethod })
          }
        />
      )}
    </>
  )
}

export default function PlatformLoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
