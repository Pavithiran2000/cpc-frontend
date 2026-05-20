import { api } from './client'
import type {
  Tenant,
  TenantSettings,
  PaginatedResponse,
  ListQuery,
} from '@/lib/types'

export const tenantsApi = {
  list: (params?: ListQuery) =>
    api.get<PaginatedResponse<Tenant>>('/tenants', { params }),

  create: (data: Partial<Tenant>) =>
    api.post<Tenant>('/tenants', data),

  getById: (id: string) =>
    api.get<Tenant>(`/tenants/${id}`),

  update: (id: string, data: Partial<Tenant>) =>
    api.patch<Tenant>(`/tenants/${id}`, data),

  getCurrent: () =>
    api.get<Tenant>('/tenants/current'),

  getCurrentSettings: () =>
    api.get<TenantSettings>('/tenants/current/settings'),

  updateCurrentSettings: (data: Partial<TenantSettings>) =>
    api.patch<TenantSettings>('/tenants/current/settings', { settings: data }),

  updateSettings: (id: string, data: Partial<TenantSettings>) =>
    api.patch<TenantSettings>(`/tenants/${id}/settings`, { settings: data }),
}
