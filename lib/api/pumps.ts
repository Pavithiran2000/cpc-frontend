import { api } from './client'
import type { Pump, PumpNozzle, PaginatedResponse, ListQuery } from '@/lib/types'

export const pumpsApi = {
  list: (params?: ListQuery) =>
    api.get<PaginatedResponse<Pump>>('/pumps', { params }),

  create: (data: Partial<Pump> & { nozzles: Partial<PumpNozzle>[] }) =>
    api.post<Pump>('/pumps', data),

  update: (id: string, data: Partial<Pump>) =>
    api.patch<Pump>(`/pumps/${id}`, data),

  listNozzles: (params?: ListQuery) =>
    api.get<PaginatedResponse<PumpNozzle>>('/pump-nozzles', { params }),

  createNozzle: (data: Partial<PumpNozzle>) =>
    api.post<PumpNozzle>('/pump-nozzles', data),

  updateNozzle: (id: string, data: Partial<PumpNozzle>) =>
    api.patch<PumpNozzle>(`/pump-nozzles/${id}`, data),
}
