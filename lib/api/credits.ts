import { api } from './client'
import type {
  CreditCustomer,
  CreditSale,
  DueCollection,
  PaginatedResponse,
  ListQuery,
} from '@/lib/types'

export const creditsApi = {
  listCustomers: (params?: ListQuery) =>
    api.get<PaginatedResponse<CreditCustomer>>('/credit-customers', { params }),

  createCustomer: (data: Partial<CreditCustomer>) =>
    api.post<CreditCustomer>('/credit-customers', data),

  listSales: (params?: ListQuery) =>
    api.get<PaginatedResponse<CreditSale>>('/credit-sales', { params }),

  createSale: (data: Partial<CreditSale>) =>
    api.post<CreditSale>('/credit-sales', data),

  listCollections: (params?: ListQuery) =>
    api.get<PaginatedResponse<DueCollection>>('/due-collections', { params }),

  createCollection: (data: Partial<DueCollection>) =>
    api.post<DueCollection>('/due-collections', data),
}
