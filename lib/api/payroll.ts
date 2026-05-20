import { api } from './client'
import type {
  PayrollRun,
  SalaryDeduction,
  PaginatedResponse,
  ListQuery,
} from '@/lib/types'

export const payrollApi = {
  listRuns: (params?: ListQuery) =>
    api.get<PaginatedResponse<PayrollRun>>('/payroll-runs', { params }),

  createRun: (data: {
    period_from: string
    period_to: string
    staff_ids?: string[]
  }) => api.post<PayrollRun>('/payroll-runs', data),

  finalizeRun: (
    id: string,
    options?: { include_pending_deductions?: boolean },
  ) => api.post<PayrollRun>(`/payroll-runs/${id}/finalize`, options),

  listDeductions: (params?: ListQuery) =>
    api.get<PaginatedResponse<SalaryDeduction>>('/salary-deductions', {
      params,
    }),

  approveDeduction: (id: string) =>
    api.post<SalaryDeduction>(`/salary-deductions/${id}/approve`),
}
