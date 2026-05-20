import { api } from './client'
import type {
  StockBalance,
  StockMovement,
  FuelTank,
  Product,
  ProductPrice,
  PaginatedResponse,
  ListQuery,
} from '@/lib/types'

export const inventoryApi = {
  listBalances: (params?: ListQuery) =>
    api.get<PaginatedResponse<StockBalance>>('/stock-balances', { params }),

  listMovements: (params?: ListQuery) =>
    api.get<PaginatedResponse<StockMovement>>('/stock-movements', { params }),

  listTanks: (params?: ListQuery) =>
    api.get<PaginatedResponse<FuelTank>>('/tanks', { params }),

  createTank: (data: Partial<FuelTank>) =>
    api.post<FuelTank>('/tanks', data),

  createAdjustment: (data: {
    product_id: string
    quantity: number
    reason: string
  }) => api.post('/stock-adjustments', data),

  nightVerify: (data: {
    business_date: string
    verifications: Array<{ product_id: string; counted_quantity: number }>
  }) => api.post('/stock-verifications/night', data),

  // Products (used in inventory/settings context)
  listProducts: (params?: ListQuery) =>
    api.get<PaginatedResponse<Product>>('/products', { params }),

  createProduct: (data: Partial<Product>) =>
    api.post<Product>('/products', data),

  updateProduct: (id: string, data: Partial<Product>) =>
    api.patch<Product>(`/products/${id}`, data),

  listPrices: (productId: string, params?: ListQuery) =>
    api.get<PaginatedResponse<ProductPrice>>(`/products/${productId}/prices`, {
      params,
    }),

  createPrice: (productId: string, data: Partial<ProductPrice>) =>
    api.post<ProductPrice>(`/products/${productId}/prices`, data),
}
