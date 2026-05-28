import { api } from './client'
import type { Cheque, ChequeStatus, PaginatedResponse, ListQuery } from '@/lib/types'

export const chequesApi = {
  list: (params?: ListQuery) =>
    api.get<PaginatedResponse<Cheque>>('/cheques', { params }),

  create: (data: Partial<Cheque>) =>
    api.post<Cheque>('/cheques', data),

  updateStatus: (
    id: string,
    data: { status: ChequeStatus },
  ) => api.patch<Cheque>(`/cheques/${id}/status`, data),
}
