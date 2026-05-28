'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle, ArrowLeft, ShieldOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
  platform_role: z.enum(['ADMIN', 'SUPPORT']),
})
type FormValues = z.infer<typeof schema>

export default function InviteAdminPage() {
  const router = useRouter()
  const { hasRole, initialized } = usePlatformAuth()
  const isSA = hasRole('SUPER_ADMIN')
  const [apiError, setApiError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // All hooks above conditional returns
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { platform_role: 'ADMIN' },
  })

  useEffect(() => {
    if (initialized && !isSA) router.replace('/platform/dashboard')
  }, [initialized, isSA, router])

  const onSubmit = handleSubmit(async (data) => {
    setApiError(null)
    try {
      await platformApi.admins.invite(data)
      setDone(true)
    } catch (err) {
      setApiError(extractPlatformError(err))
    }
  })

  if (!initialized) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="animate-pulse rounded-xl border border-border bg-card p-8 h-64" />
      </div>
    )
  }

  if (!isSA) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mb-4 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-rose-500/10">
            <ShieldOff size={22} className="text-rose-500" />
          </div>
          <h2 className="font-syne text-lg font-bold text-foreground">Access Denied</h2>
          <p className="mt-2 text-sm text-foreground/50">Only Super Admins can invite new platform admins.</p>
          <Link href="/platform/dashboard" className="mt-6 inline-block rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03]">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const fieldCls = (hasError?: boolean) =>
    [
      'w-full rounded-lg border px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/40 bg-background',
      hasError
        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
        : 'border-border focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/15',
    ].join(' ')

  if (done) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mb-4 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle size={22} className="text-emerald-600" />
          </div>
          <h2 className="font-syne text-lg font-bold text-foreground">Invitation sent</h2>
          <p className="mt-2 text-sm text-foreground/50">
            The admin will receive an email with their temporary password.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => setDone(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground/70 hover:bg-foreground/5"
            >
              Invite another
            </button>
            <button
              onClick={() => router.push('/platform/admins')}
              className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03]"
            >
              View admins
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/platform/admins" className="text-foreground/40 hover:text-foreground/70">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Invite Admin</h1>
          <p className="mt-0.5 text-sm text-foreground/50">Send an invitation to a new platform admin</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">Full Name</label>
            <input {...register('name')} type="text" placeholder="Jane Smith" className={fieldCls(!!errors.name)} />
            {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">Email</label>
            <input {...register('email')} type="email" placeholder="jane@cpc-platform.local" className={fieldCls(!!errors.email)} />
            {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">Role</label>
            <select {...register('platform_role')} className={fieldCls(!!errors.platform_role)}>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPPORT">SUPPORT</option>
            </select>
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
              'Send Invitation'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
