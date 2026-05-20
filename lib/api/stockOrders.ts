import { api } from './client'
import type {
  StockOrder,
  SupplierPayment,
  PaginatedResponse,
  ListQuery,
} from '@/lib/types'

export const stockOrdersApi = {
  list: (params?: ListQuery) =>
    api.get<PaginatedResponse<StockOrder>>('/stock-orders', { params }),

  create: (data: Partial<StockOrder>) =>
    api.post<StockOrder>('/stock-orders', data),

  approve: (id: string) =>
    api.post<StockOrder>(`/stock-orders/${id}/approve`),

  addPayment: (id: string, data: Partial<SupplierPayment>) =>
    api.post<SupplierPayment>(`/stock-orders/${id}/payments`, data),
}
