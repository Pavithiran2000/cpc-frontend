'use client'

import { createContext, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import type { PortalUser } from '@/lib/types'

export const AUTH_KEY = ['auth', 'me'] as const

type LoginResult = { requires_2fa: true; challenge_token: string } | { requires_2fa: false }

interface AuthContextValue {
  user: PortalUser | null
  isLoading: boolean
  login: (station_code: string, email: string, password: string) => Promise<LoginResult>
  loginWithChallenge: (challenge_token: string, code: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => ({ requires_2fa: false }),
  loginWithChallenge: async () => {},
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
    async (station_code: string, email: string, password: string): Promise<LoginResult> => {
      const res = await authApi.login(station_code, email, password)
      const data = res.data as { requires_2fa?: boolean; challenge_token?: string; user?: PortalUser }
      if (data.requires_2fa) {
        return { requires_2fa: true, challenge_token: data.challenge_token! }
      }
      queryClient.setQueryData(AUTH_KEY, data.user)
      router.push('/')
      return { requires_2fa: false }
    },
    [queryClient, router],
  )

  const loginWithChallenge = useCallback(
    async (challenge_token: string, code: string) => {
      const res = await authApi.challenge2fa(challenge_token, code)
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
    <AuthContext.Provider value={{ user, isLoading, login, loginWithChallenge, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
