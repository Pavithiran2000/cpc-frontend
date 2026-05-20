import { api } from './client'
import type {
  BowserReceipt,
  BowserReceiptLine,
  PaginatedResponse,
  ListQuery,
} from '@/lib/types'

export const bowserApi = {
  list: (params?: ListQuery) =>
    api.get<PaginatedResponse<BowserReceipt>>('/bowser-receipts', { params }),

  create: (data: Partial<BowserReceipt>) =>
    api.post<BowserReceipt>('/bowser-receipts', data),

  getById: (id: string) =>
    api.get<BowserReceipt>(`/bowser-receipts/${id}`),

  approve: (id: string, lines: Partial<BowserReceiptLine>[]) =>
    api.post<BowserReceipt>(`/bowser-receipts/${id}/approve`, { lines }),
}
