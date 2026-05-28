'use client'

import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export default function PlatformNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E85D04]/10 mb-6">
        <Shield size={28} className="text-[#E85D04]" />
      </div>
      <h1 className="font-syne text-5xl font-bold text-foreground mb-2">404</h1>
      <p className="text-lg font-semibold text-foreground/60 mb-1">Page not found</p>
      <p className="text-sm text-foreground/40 mb-8 max-w-sm">
        The platform page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/platform/dashboard"
        className="flex items-center gap-2 rounded-lg bg-[#E85D04] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Dashboard
      </Link>
    </div>
  )
}
