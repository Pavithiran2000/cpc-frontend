'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function PlatformRootPage() {
  const { isAuthenticated, initialized } = usePlatformAuth()
  const router = useRouter()

  useEffect(() => {
    if (!initialized) return
    if (isAuthenticated) {
      router.replace('/platform/dashboard')
    } else {
      router.replace('/platform/login')
    }
  }, [initialized, isAuthenticated, router])

  return (
    <div className="flex h-screen items-center justify-center bg-[#0f1117]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
