import { api } from './client'
import type { PortalUser } from '@/lib/types'

export const authApi = {
  login: (station_code: string, email: string, password: string) =>
    api.post<{ user: PortalUser }>('/auth/login', { station_code, email, password }),

  refresh: () => api.post('/auth/refresh'),

  logout: () => api.post<{ ok: boolean }>('/auth/logout'),

  me: () => api.get<{ user: PortalUser }>('/auth/me'),

  updateProfile: (data: { name?: string; phone?: string }) =>
    api.patch<{ user: PortalUser }>('/auth/profile', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<{ ok: boolean }>('/auth/change-password', data),

  setup2fa: () =>
    api.post<{ qr_code_url: string; manual_entry_key: string }>('/auth/2fa/setup'),

  activate2fa: (code: string) =>
    api.post<{ ok: boolean }>('/auth/2fa/activate', { code }),

  disable2fa: (data: { password: string; code: string }) =>
    api.post<{ ok: boolean }>('/auth/2fa/disable', data),

  challenge2fa: (challenge_token: string, code: string) =>
    api.post<{ user: PortalUser }>('/auth/2fa/challenge', { challenge_token, code }),
}
