'use client'

import {
  createContext,
  useCallback,
  useContext,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import type { PlatformAdmin, PlatformRole, MfaMethod } from '@/lib/platform-types'

// ─── Query key ────────────────────────────────────────────────────────────────

export const PLATFORM_AUTH_KEY = ['platform', 'auth', 'me'] as const

// ─── Types ────────────────────────────────────────────────────────────────────

export type MfaLoginResult =
  | { requiresMfa: true; tempToken: string; mfaMethod: MfaMethod }
  | { requiresMfa: false }

interface PlatformAuthContextValue {
  admin: PlatformAdmin | null
  loading: boolean
  initialized: boolean
  isAuthenticated: boolean
  hasRole: (role: PlatformRole) => boolean
  hasAnyRole: (roles: PlatformRole[]) => boolean
  login: (email: string, password: string) => Promise<MfaLoginResult>
  logout: () => Promise<void>
  refreshAdmin: () => Promise<void>
}

// ─── Role hierarchy ───────────────────────────────────────────────────────────
// SUPER_ADMIN passes all checks
// ADMIN passes ADMIN and SUPPORT
// SUPPORT passes SUPPORT only

function roleCovers(actual: PlatformRole, required: PlatformRole): boolean {
  if (actual === 'SUPER_ADMIN') return true
  if (actual === 'ADMIN') return required === 'ADMIN' || required === 'SUPPORT'
  return actual === required
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PlatformAuthContext = createContext<PlatformAuthContextValue>({
  admin: null,
  loading: true,
  initialized: false,
  isAuthenticated: false,
  hasRole: () => false,
  hasAnyRole: () => false,
  login: async () => ({ requiresMfa: false }),
  logout: async () => {},
  refreshAdmin: async () => {},
})

export function usePlatformAuth() {
  return useContext(PlatformAuthContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlatformAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const {
    data: admin = null,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: PLATFORM_AUTH_KEY,
    queryFn: async () => {
      try {
        const res = await platformApi.auth.me()
        return (res.data as { admin: PlatformAdmin }).admin
      } catch {
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const refreshAdmin = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: PLATFORM_AUTH_KEY })
  }, [queryClient])

  const login = useCallback(
    async (email: string, password: string): Promise<MfaLoginResult> => {
      const res = await platformApi.auth.login({ email, password })
      const data = res.data as {
        requires_mfa?: boolean
        temp_token?: string
        mfa_method?: MfaMethod
        admin?: PlatformAdmin
      }

      if (data.requires_mfa) {
        return {
          requiresMfa: true,
          tempToken: data.temp_token!,
          mfaMethod: data.mfa_method!,
        }
      }

      queryClient.setQueryData(PLATFORM_AUTH_KEY, data.admin ?? null)
      return { requiresMfa: false }
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    try {
      await platformApi.auth.logout()
    } catch {
      // ignore — clear state regardless
    }
    queryClient.removeQueries({ queryKey: PLATFORM_AUTH_KEY })
    router.push('/platform/login')
  }, [queryClient, router])

  const hasRole = useCallback(
    (role: PlatformRole): boolean => {
      if (!admin) return false
      return roleCovers(admin.platformRole, role)
    },
    [admin],
  )

  const hasAnyRole = useCallback(
    (roles: PlatformRole[]): boolean => {
      if (!admin) return false
      return roles.some((r) => roleCovers(admin.platformRole, r))
    },
    [admin],
  )

  return (
    <PlatformAuthContext.Provider
      value={{
        admin,
        loading: isLoading,
        initialized: isFetched,
        isAuthenticated: admin !== null,
        hasRole,
        hasAnyRole,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  )
}

export { extractPlatformError }
