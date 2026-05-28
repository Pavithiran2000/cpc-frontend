'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PlatformProfileRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/platform/settings')
  }, [router])
  return null
}
