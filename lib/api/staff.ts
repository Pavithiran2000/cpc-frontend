import { api } from './client'
import type {
  StaffProfile,
  OperationalRole,
  PaginatedResponse,
  ListQuery,
} from '@/lib/types'

export const staffApi = {
  list: (params?: ListQuery) =>
    api.get<PaginatedResponse<StaffProfile>>('/staff', { params }),

  create: (data: Partial<StaffProfile>) =>
    api.post<StaffProfile>('/staff', data),

  getById: (id: string) =>
    api.get<StaffProfile>(`/staff/${id}`),

  update: (id: string, data: Partial<StaffProfile>) =>
    api.patch<StaffProfile>(`/staff/${id}`, data),

  softDelete: (id: string) =>
    api.delete<{ ok: boolean }>(`/staff/${id}`),

  listRoles: (params?: ListQuery) =>
    api.get<PaginatedResponse<OperationalRole>>('/operational-roles', {
      params,
    }),

  createRole: (data: Partial<OperationalRole>) =>
    api.post<OperationalRole>('/operational-roles', data),

  updateRole: (id: string, data: Partial<OperationalRole>) =>
    api.patch<OperationalRole>(`/operational-roles/${id}`, data),
}
