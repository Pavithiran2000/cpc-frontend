import { api } from './client'

export interface RegisterStartPayload {
  station_code: string
  station_name: string
  owner_name: string
  phone: string
  country: string
  address_line1: string
  address_line2?: string
  province_id: number
  district_id: number
  geo_city_id?: number
  custom_city_name?: string
  postal_code?: string
  owner_email: string
  password: string
}

export interface RegisterStartResponse {
  registration_id: string
  email: string
  expires_at: string
  resend_after_seconds: number
}

export interface RegisterVerifyResponse {
  station_code: string
  station_name: string
  owner_email: string
}

export const registerApi = {
  start: (data: RegisterStartPayload) =>
    api.post<RegisterStartResponse>('/auth/register/start', data),

  verify: (registration_id: string, code: string) =>
    api.post<RegisterVerifyResponse>('/auth/register/verify', { registration_id, code }),

  resendCode: (registration_id: string) =>
    api.post<RegisterStartResponse>('/auth/register/resend-code', { registration_id }),
}
