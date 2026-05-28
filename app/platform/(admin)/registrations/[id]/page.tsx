'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronRight, ArrowLeft, ClipboardList, CheckCircle2,
  XCircle, Mail, RefreshCw, X,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { RegistrationAttempt, RegistrationStatus } from '@/lib/platform-types'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const cls =
    status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400' :
    status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400' :
    'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400'
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${cls}`}>
      {status}
    </span>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoCard({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40">{label}</p>
      <p className={`mt-2 text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-foreground/25">—</span>}
      </p>
    </div>
  )
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  open, onClose, registrationId, onSuccess,
}: {
  open: boolean; onClose: () => void; registrationId: string; onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const mut = useMutation({
    mutationFn: () =>
      platformApi.registrations.reject(registrationId, { reason: reason.trim() || undefined }),
    onSuccess: () => {
      toast.success('Registration rejected')
      onSuccess()
      onClose()
    },
    onError: (err) => setError(extractPlatformError(err)),
  })

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">Reject Registration</h2>
          <button onClick={onClose} className="rounded p-1 text-foreground/40 hover:bg-foreground/8 hover:text-foreground/60">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError('') }}
              rows={3}
              placeholder="Describe why this registration is being rejected…"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-rose-400/50 focus:outline-none"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">{error}</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
            >
              {mut.isPending ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const { hasRole } = usePlatformAuth()
  const canWrite = hasRole('ADMIN')
  const [rejectOpen, setRejectOpen] = useState(false)

  const regQ = useQuery<RegistrationAttempt>({
    queryKey: ['platform', 'registration', id],
    queryFn: async () => {
      const res = await platformApi.registrations.get(id)
      return res.data as RegistrationAttempt
    },
    staleTime: 30_000,
    retry: 1,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['platform', 'registration', id] })
    queryClient.invalidateQueries({ queryKey: ['platform', 'registrations'] })
  }

  const approveMut = useMutation({
    mutationFn: () => platformApi.registrations.approve(id),
    onSuccess: () => { toast.success('Registration approved'); refresh() },
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const resendMut = useMutation({
    mutationFn: () => platformApi.registrations.resend(id),
    onSuccess: () => toast.success('Email resent'),
    onError: (err) => toast.error(extractPlatformError(err)),
  })

  const reg = regQ.data

  if (regQ.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ClipboardList size={40} className="mb-4 text-foreground/25" />
        <h2 className="font-syne text-lg font-bold text-foreground/70">Registration not found</h2>
        <p className="mt-1 text-sm text-foreground/40">This record may have been removed or the ID is invalid.</p>
        <Link
          href="/platform/registrations"
          className="mt-5 flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Registrations
        </Link>
      </div>
    )
  }

  const isPending = reg?.status === 'PENDING'

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-foreground/40">
        <span>Platform</span>
        <ChevronRight size={13} />
        <Link href="/platform/registrations" className="hover:text-[#E85D04] transition-colors">
          Registrations
        </Link>
        <ChevronRight size={13} />
        {regQ.isLoading ? (
          <div className="h-3.5 w-24 animate-pulse rounded bg-foreground/8" />
        ) : (
          <span className="font-medium text-foreground/70 font-mono">{reg?.stationCode}</span>
        )}
      </nav>

      {/* Header */}
      {regQ.isLoading ? (
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-64 rounded bg-foreground/8 mb-2" />
          <div className="h-4 w-32 rounded bg-foreground/6" />
        </div>
      ) : reg ? (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-syne text-2xl font-bold text-foreground">{reg.stationName}</h1>
              <StatusBadge status={reg.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-foreground/40">
              {reg.stationCode} · Submitted {formatRelativeTime(reg.createdAt)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => regQ.refetch()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors"
            >
              <RefreshCw size={13} />
            </button>

            {canWrite && (
              <>
                <button
                  onClick={() => resendMut.mutate()}
                  disabled={resendMut.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-colors disabled:opacity-40"
                >
                  <Mail size={14} /> Resend Email
                </button>

                {isPending && (
                  <>
                    <button
                      onClick={() => setRejectOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-card px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      onClick={() => approveMut.mutate()}
                      disabled={approveMut.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} />
                      {approveMut.isPending ? 'Approving…' : 'Approve'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Info grid */}
      {regQ.isLoading ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
              <div className="h-3 w-20 rounded bg-foreground/8" />
              <div className="mt-3 h-4 w-32 rounded bg-foreground/8" />
            </div>
          ))}
        </div>
      ) : reg ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard label="Applicant Name" value={reg.name} />
            <InfoCard label="Email" value={reg.email} mono />
            <InfoCard label="Station Code" value={<span className="font-mono">{reg.stationCode}</span>} />
            <InfoCard label="District" value={reg.district} />
            <InfoCard label="Contact Number" value={reg.contactNumber} />
            <InfoCard label="Submitted" value={formatDate(reg.createdAt)} mono />
          </div>

          {reg.address && (
            <div className="mb-6 rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-2">Address</p>
              <p className="text-sm text-foreground">{reg.address}</p>
            </div>
          )}

          {/* Review info */}
          {reg.status !== 'PENDING' && (
            <div className={`mb-6 rounded-xl border p-5 ${
              reg.status === 'APPROVED' ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-rose-500/25 bg-rose-500/10'
            }`}>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
                reg.status === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {reg.status === 'APPROVED' ? 'Approval Details' : 'Rejection Details'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-foreground/50">Reviewed by</p>
                  <p className="text-sm font-medium text-foreground">{reg.reviewedByEmail ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Reviewed at</p>
                  <p className="text-sm font-mono text-foreground">{reg.reviewedAt ? formatDateTime(reg.reviewedAt) : '—'}</p>
                </div>
                {reg.rejectionReason && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-foreground/50">Reason</p>
                    <p className="text-sm text-rose-700">{reg.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Reject modal */}
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        registrationId={id}
        onSuccess={refresh}
      />
    </div>
  )
}
