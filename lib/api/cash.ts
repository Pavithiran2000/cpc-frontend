import { api } from './client'
import type { DailyCashBalance, PaginatedResponse, ListQuery } from '@/lib/types'

export const cashApi = {
  shiftSummary: (shiftSessionId: string) =>
    api.get(`/cash/shift-summary/${shiftSessionId}`),

  listDailyBalances: (params?: ListQuery) =>
    api.get<PaginatedResponse<DailyCashBalance>>('/daily-balancing', { params }),

  createDailyBalance: (data: {
    business_date: string
    expected_cash: number
    actual_cash: number
    opening_cash?: number
    bank_deposit?: number
  }) => api.post<DailyCashBalance>('/daily-balancing', data),

  closeDailyBalance: (id: string) =>
    api.post<DailyCashBalance>(`/daily-balancing/${id}/close`),
}
