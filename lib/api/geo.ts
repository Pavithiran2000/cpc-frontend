import { api } from './client'

export interface GeoProvince {
  id: number
  name: string
}

export interface GeoDistrict {
  id: number
  provinceId: number
  name: string
}

export interface GeoCityResult {
  id: number | string
  source: 'OFFICIAL' | 'CUSTOM'
  name: string
  sub_name?: string
  postal_code?: string
  latitude?: string
  longitude?: string
  district?: GeoProvince
  province?: GeoProvince
}

export const geoApi = {
  provinces: () => api.get<GeoProvince[]>('/geo/provinces'),

  districts: (province_id?: number) =>
    api.get<GeoDistrict[]>('/geo/districts', { params: { province_id } }),

  cities: (params: { search?: string; district_id?: number }) =>
    api.get<GeoCityResult[]>('/geo/cities', { params }),
}
