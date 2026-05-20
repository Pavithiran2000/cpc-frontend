'use client'

import { useContext } from 'react'
import { AuthContext } from '@/providers/AuthProvider'

export function useAuth() {
  const ctx = useContext(AuthContext)

  return {
    ...ctx,
    isAdmin: () => ctx.user?.portal_role === 'ADMIN',
    isOwner: () => ctx.user?.portal_role === 'OWNER',
  }
}
