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
    period_start: string
    period_end: string
  }) => api.post<PayrollRun>('/payroll-runs', data),

  finalizeRun: (
    id: string,
    options?: { attendance_override?: boolean },
  ) => api.post<PayrollRun>(`/payroll-runs/${id}/finalize`, options),

  listDeductions: (params?: ListQuery) =>
    api.get<PaginatedResponse<SalaryDeduction>>('/salary-deductions', {
      params,
    }),

  approveDeduction: (id: string) =>
    api.post<SalaryDeduction>(`/salary-deductions/${id}/approve`),
}
