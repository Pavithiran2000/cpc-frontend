import { api } from './client'
import type {
  DashboardData,
  ShiftSummaryRow,
  StockReportRow,
  ProfitLossReport,
  PaginatedResponse,
} from '@/lib/types'

interface ReportQuery {
  date_from?: string
  date_to?: string
  shift_template_id?: string
  staff_id?: string
  status?: string
  page?: number
  limit?: number
}

export const reportsApi = {
  dashboard: () =>
    api.get<DashboardData>('/reports/dashboard'),

  shiftSummary: (params?: ReportQuery) =>
    api.get<PaginatedResponse<ShiftSummaryRow>>('/reports/shift-summary', {
      params,
    }),

  stock: (params?: ReportQuery) =>
    api.get<PaginatedResponse<StockReportRow>>('/reports/stock', { params }),

  pumpMeters: (params?: ReportQuery) =>
    api.get('/reports/pump-meters', { params }),

  attendance: (params?: ReportQuery) =>
    api.get('/reports/attendance', { params }),

  dailySales: (params?: ReportQuery) =>
    api.get('/reports/daily-sales', { params }),

  pumperShortfalls: (params?: ReportQuery) =>
    api.get('/reports/pumper-shortfalls', { params }),

  payrollDeductions: (params?: ReportQuery) =>
    api.get('/reports/payroll-deductions', { params }),

  bowserReceipts: (params?: ReportQuery) =>
    api.get('/reports/bowser-receipts', { params }),

  stockOrders: (params?: ReportQuery) =>
    api.get('/reports/stock-orders', { params }),

  creditDues: (params?: ReportQuery) =>
    api.get('/reports/credit-dues', { params }),

  cheques: (params?: ReportQuery) =>
    api.get('/reports/cheques', { params }),

  bankDeposits: (params?: ReportQuery) =>
    api.get('/reports/bank-deposits', { params }),

  profitLoss: (params?: ReportQuery) =>
    api.get<ProfitLossReport>('/reports/profit-loss', { params }),

  cpcStock: (params?: ReportQuery) =>
    api.get('/reports/cpc-stock', { params }),

  generateCpcStock: (data: { report_date: string; report_type?: string }) =>
    api.post('/reports/cpc-stock/generate', data),

  submitCpcStock: (
    id: string,
    data: { submitted_to?: string; submission_date?: string },
  ) => api.post(`/reports/cpc-stock/${id}/submit`, data),
}
