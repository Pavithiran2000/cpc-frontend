'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Platform Error]', error.message, error.digest ?? '')
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-rose-500/10">
          <AlertTriangle size={22} className="text-rose-600" />
        </div>
        <h1 className="font-syne text-lg font-bold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-foreground/50">
          An unexpected error occurred in the platform admin portal. Please try again or contact support if the issue persists.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2.5 font-syne font-semibold text-sm text-white hover:bg-[#c94e03] transition-colors"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
          <Link
            href="/platform/dashboard"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
