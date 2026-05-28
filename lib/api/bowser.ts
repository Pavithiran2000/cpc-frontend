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

  create: (data: {
    receipt_no: string
    received_date: string
    supplier_name?: string
    vehicle_no?: string
    driver_name?: string
    lines: Array<{ tank_id: string; product_id: string; received_litres: number; unit_cost: number }>
  }) =>
    api.post<BowserReceipt>('/bowser-receipts', data),

  getById: (id: string) =>
    api.get<BowserReceipt>(`/bowser-receipts/${id}`),

  approve: (id: string, lines: Partial<BowserReceiptLine>[]) =>
    api.post<BowserReceipt>(`/bowser-receipts/${id}/approve`, { lines }),
}
