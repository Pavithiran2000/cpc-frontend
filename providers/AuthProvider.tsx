'use client'

import { createContext, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import type { PortalUser } from '@/lib/types'

export const AUTH_KEY = ['auth', 'me'] as const

interface AuthContextValue {
  user: PortalUser | null
  isLoading: boolean
  login: (station_code: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: user = null, isLoading } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => authApi.me().then((r) => r.data.user),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const login = useCallback(
    async (station_code: string, email: string, password: string) => {
      const res = await authApi.login(station_code, email, password)
      queryClient.setQueryData(AUTH_KEY, res.data.user)
      router.push('/')
    },
    [queryClient, router],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    queryClient.clear()
    router.push('/login')
  }, [queryClient, router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
