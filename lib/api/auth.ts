import { api } from './client'
import type { PortalUser } from '@/lib/types'

export const authApi = {
  login: (station_code: string, email: string, password: string) =>
    api.post<{ user: PortalUser }>('/auth/login', { station_code, email, password }),

  refresh: () => api.post('/auth/refresh'),

  logout: () => api.post<{ ok: boolean }>('/auth/logout'),

  me: () => api.get<{ user: PortalUser }>('/auth/me'),
}
