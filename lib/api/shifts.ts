import { api } from './client'
import type {
  ShiftTemplate,
  ShiftSession,
  AttendanceRecord,
  CorrectionRequest,
  PaginatedResponse,
  ListQuery,
  PumperAssignment,
} from '@/lib/types'

export const shiftsApi = {
  // Templates
  listTemplates: (params?: ListQuery) =>
    api.get<PaginatedResponse<ShiftTemplate>>('/shift-templates', { params }),

  createTemplate: (data: Partial<ShiftTemplate>) =>
    api.post<ShiftTemplate>('/shift-templates', data),

  updateTemplate: (id: string, data: Partial<ShiftTemplate>) =>
    api.patch<ShiftTemplate>(`/shift-templates/${id}`, data),

  // Sessions
  listSessions: (params?: ListQuery) =>
    api.get<PaginatedResponse<ShiftSession>>('/shift-sessions', { params }),

  createSession: (data: { shift_template_id: string; business_date: string }) =>
    api.post<ShiftSession>('/shift-sessions', data),

  getSession: (id: string) =>
    api.get<ShiftSession>(`/shift-sessions/${id}`),

  openSession: (id: string) =>
    api.post<ShiftSession>(`/shift-sessions/${id}/open`),

  cancelSession: (id: string) =>
    api.post<ShiftSession>(`/shift-sessions/${id}/cancel`),

  setAssignments: (id: string, assignments: Array<{ pumper_id: string; nozzle_id: string }>) =>
    api.post(`/shift-sessions/${id}/assignments`, { assignments }),

  setOpeningReadings: (
    id: string,
    readings: Array<{ nozzle_id: string; meter_reading: number }>,
  ) => api.post(`/shift-sessions/${id}/opening-readings`, { readings }),

  setClosingReadings: (
    id: string,
    readings: Array<{ nozzle_id: string; meter_reading: number }>,
  ) => api.post(`/shift-sessions/${id}/closing-readings`, { readings }),

  setCashSubmissions: (
    id: string,
    submissions: Array<{ pumper_id: string; actual_cash: number }>,
  ) => api.post(`/shift-sessions/${id}/cash-submissions`, { submissions }),

  closeSession: (
    id: string,
    closingReadings: Array<{ nozzle_id: string; meter_reading: number }>,
    cashSubmissions: Array<{ pumper_id: string; actual_cash: number }>,
  ) =>
    api.post<ShiftSession>(`/shift-sessions/${id}/close`, {
      closing_readings: closingReadings,
      cash_submissions: cashSubmissions,
    }),

  // Attendance
  listAttendance: (params?: ListQuery & { shift_session_id?: string }) =>
    api.get<PaginatedResponse<AttendanceRecord>>('/attendance', { params }),

  clockIn: (data: { shift_session_id: string; staff_id: string }) =>
    api.post<AttendanceRecord>('/attendance/clock-in', data),

  clockOut: (data: { shift_session_id: string; staff_id: string }) =>
    api.post<AttendanceRecord>('/attendance/clock-out', data),

  // Corrections
  listCorrections: (params?: ListQuery) =>
    api.get<PaginatedResponse<CorrectionRequest>>('/shift-corrections', {
      params,
    }),

  createCorrection: (data: Partial<CorrectionRequest>) =>
    api.post<CorrectionRequest>('/shift-corrections', data),

  approveCorrection: (id: string) =>
    api.post<CorrectionRequest>(`/shift-corrections/${id}/approve`),

  applyCorrection: (id: string) =>
    api.post(`/shift-corrections/${id}/apply`),
}
