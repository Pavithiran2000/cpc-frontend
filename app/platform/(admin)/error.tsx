'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Platform Admin Error]', error.message, error.digest ?? '')
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
        <AlertTriangle size={24} className="text-rose-500" />
      </div>
      <h2 className="font-syne text-xl font-bold text-foreground">Something went wrong</h2>
      <p className="mt-2 max-w-sm text-sm text-foreground/50">
        An unexpected error occurred on this page. The issue has been logged. You can try again or return to the dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
        >
          <RefreshCw size={13} />
          Try Again
        </button>
        <Link
          href="/platform/dashboard"
          className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
        >
          <LayoutDashboard size={13} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
