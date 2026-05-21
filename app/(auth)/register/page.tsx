'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, Mail, RefreshCw, Search } from 'lucide-react'
import { geoApi, type GeoCityResult } from '@/lib/api/geo'
import { registerApi, type RegisterStartPayload, type RegisterVerifyResponse } from '@/lib/api/register'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

type Step = 0 | 1 | 2 | 3 | 4

interface FormState {
  station_code: string
  station_name: string
  owner_name: string
  phone: string
  country: string
  address_line1: string
  address_line2: string
  city_search: string
  custom_city: boolean
  custom_city_name: string
  province_id: string
  district_id: string
  geo_city_id: string
  city_name: string
  district_name: string
  province_name: string
  postal_code: string
  owner_email: string
  password: string
  confirm_password: string
  code: string
}

const initialForm: FormState = {
  station_code: '',
  station_name: '',
  owner_name: '',
  phone: '',
  country: 'Sri Lanka',
  address_line1: '',
  address_line2: '',
  city_search: '',
  custom_city: false,
  custom_city_name: '',
  province_id: '',
  district_id: '',
  geo_city_id: '',
  city_name: '',
  district_name: '',
  province_name: '',
  postal_code: '',
  owner_email: '',
  password: '',
  confirm_password: '',
  code: '',
}

const steps = ['Station', 'Address', 'Owner', 'Verify', 'Complete']

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizePhone(value: string) {
  return value.trim().replace(/[\s\-()]/g, '')
}

function inputCls(hasError?: boolean, extra = '') {
  return [
    'w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white',
    'placeholder:text-white/25 outline-none transition-colors',
    hasError ? 'border-rose-500/50 focus:border-rose-500/70' : 'border-white/10 focus:border-[#E85D04]/60',
    extra,
  ].join(' ')
}

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string
  error?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {label}
        {hint && (
          <span title={hint}>
            <HelpCircle size={13} className="text-white/30" />
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

function apiMessage(err: unknown, fallback: string) {
  const axiosErr = err as AxiosError<{ message?: string | string[] }>
  const msg = axiosErr.response?.data?.message
  return Array.isArray(msg) ? msg[0] : (msg ?? fallback)
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationId, setRegistrationId] = useState<string | null>(null)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [complete, setComplete] = useState<RegisterVerifyResponse | null>(null)

  const provincesQuery = useQuery({
    queryKey: ['geo', 'provinces'],
    queryFn: () => geoApi.provinces().then((r) => r.data),
  })

  const districtsQuery = useQuery({
    queryKey: ['geo', 'districts', form.province_id],
    queryFn: () => geoApi.districts(Number(form.province_id)).then((r) => r.data),
    enabled: form.custom_city && !!form.province_id,
  })

  const citiesQuery = useQuery({
    queryKey: ['geo', 'cities', form.city_search],
    queryFn: () => geoApi.cities({ search: form.city_search }).then((r) => r.data),
    enabled: !form.custom_city && form.city_search.trim().length >= 2,
  })

  const selectedProvince = useMemo(
    () => provincesQuery.data?.find((province) => String(province.id) === form.province_id),
    [form.province_id, provincesQuery.data],
  )

  const setValue = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
    setApiError(null)
  }

  const selectCity = (city: GeoCityResult) => {
    setForm((prev) => ({
      ...prev,
      city_search: city.name,
      geo_city_id: String(city.id),
      city_name: city.name,
      district_id: city.district ? String(city.district.id) : '',
      district_name: city.district?.name ?? '',
      province_id: city.province ? String(city.province.id) : '',
      province_name: city.province?.name ?? '',
      postal_code: city.postal_code ?? '',
    }))
    setErrors((prev) => ({ ...prev, city: '', province_id: '', district_id: '' }))
  }

  const validateStep = (targetStep = step) => {
    const nextErrors: Record<string, string> = {}

    if (targetStep === 0) {
      const stationCode = form.station_code.trim().toUpperCase()
      if (!/^[A-Z0-9-]{3,30}$/.test(stationCode)) nextErrors.station_code = 'Use 3-30 letters, numbers, or hyphens'
      if (!normalizeSpaces(form.station_name)) nextErrors.station_name = 'Station name is required'
      if (!normalizeSpaces(form.owner_name)) nextErrors.owner_name = 'Owner name is required'
      if (!/^\+?[0-9]{7,15}$/.test(normalizePhone(form.phone))) nextErrors.phone = 'Enter a valid phone number'
    }

    if (targetStep === 1) {
      if (form.country !== 'Sri Lanka') nextErrors.country = 'Only Sri Lanka is supported'
      if (!normalizeSpaces(form.address_line1)) nextErrors.address_line1 = 'Address line 1 is required'
      if (form.custom_city) {
        if (!normalizeSpaces(form.custom_city_name)) nextErrors.custom_city_name = 'City is required'
        if (!form.province_id) nextErrors.province_id = 'Province is required'
        if (!form.district_id) nextErrors.district_id = 'District is required'
      } else if (!form.geo_city_id) {
        nextErrors.city = 'Select a city or use custom city'
      }
    }

    if (targetStep === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email.trim())) nextErrors.owner_email = 'Enter a valid email'
      if (form.password.length < 8) nextErrors.password = 'Minimum 8 characters'
      if (form.confirm_password !== form.password) nextErrors.confirm_password = 'Passwords do not match'
    }

    if (targetStep === 3) {
      if (!/^[0-9]{6}$/.test(form.code.trim())) nextErrors.code = 'Enter the 6-digit code'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const nextStep = () => {
    if (!validateStep()) return
    setStep((prev) => Math.min(prev + 1, 4) as Step)
  }

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0) as Step)

  const buildPayload = (): RegisterStartPayload => {
    const payload: RegisterStartPayload = {
      station_code: form.station_code.trim().toUpperCase(),
      station_name: normalizeSpaces(form.station_name),
      owner_name: normalizeSpaces(form.owner_name),
      phone: normalizePhone(form.phone),
      country: form.country,
      address_line1: normalizeSpaces(form.address_line1),
      address_line2: normalizeSpaces(form.address_line2) || undefined,
      province_id: Number(form.province_id),
      district_id: Number(form.district_id),
      postal_code: normalizeSpaces(form.postal_code) || undefined,
      owner_email: form.owner_email.trim().toLowerCase(),
      password: form.password,
    }
    if (form.custom_city) {
      payload.custom_city_name = normalizeSpaces(form.custom_city_name)
    } else {
      payload.geo_city_id = Number(form.geo_city_id)
    }
    return payload
  }

  const startRegistration = async () => {
    if (!validateStep(2) || !validateStep(1) || !validateStep(0)) return
    setIsSubmitting(true)
    setApiError(null)
    try {
      const res = await registerApi.start(buildPayload())
      setRegistrationId(res.data.registration_id)
      setMaskedEmail(res.data.email)
      setStep(3)
    } catch (err) {
      setApiError(apiMessage(err, 'Could not start registration'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyRegistration = async () => {
    if (!registrationId || !validateStep(3)) return
    setIsSubmitting(true)
    setApiError(null)
    try {
      const res = await registerApi.verify(registrationId, form.code.trim())
      setComplete(res.data)
      setStep(4)
    } catch (err) {
      setApiError(apiMessage(err, 'Could not verify code'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resendCode = async () => {
    if (!registrationId) return
    setIsSubmitting(true)
    setApiError(null)
    try {
      const res = await registerApi.resendCode(registrationId)
      setMaskedEmail(res.data.email)
    } catch (err) {
      setApiError(apiMessage(err, 'Could not resend code'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white lg:flex">
      <aside className="hidden w-[36%] flex-col justify-between bg-[#0A0A0B] px-12 py-12 lg:flex">
        <div>
          <p className="font-syne text-6xl font-extrabold text-[#E85D04]">CPC</p>
          <p className="mt-2 text-sm text-white/35">Filling Station Management</p>
        </div>
        <div>
          <p className="font-syne text-3xl font-bold leading-tight">Register your station</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/45">
            Create a tenant account, verify the owner email, and use the station code to sign in.
          </p>
        </div>
        <Link href="/login" className="text-sm font-semibold text-[#E85D04] hover:text-[#F48C06]">
          Back to login
        </Link>
      </aside>

      <main className="flex min-h-screen flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-2xl">
          <div className="mb-7 flex items-center justify-between gap-2">
            {steps.map((label, index) => (
              <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    index <= step ? 'border-[#E85D04] bg-[#E85D04] text-white' : 'border-white/10 text-white/35',
                  ].join(' ')}
                >
                  {index < step ? <CheckCircle2 size={14} /> : index + 1}
                </div>
                <span className="hidden truncate text-xs text-white/45 sm:block">{label}</span>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-white/8 bg-[#111114] p-5 sm:p-6">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Station Code" error={errors.station_code} hint="Use CPC001, CPC-COLOMBO-01, or STA-001. Letters, numbers, hyphens only.">
                  <input value={form.station_code} onChange={(e) => setValue('station_code', e.target.value.toUpperCase())} className={inputCls(!!errors.station_code, 'uppercase tracking-widest')} placeholder="CPC001" />
                </Field>
                <Field label="Phone" error={errors.phone}>
                  <input value={form.phone} onChange={(e) => setValue('phone', e.target.value)} className={inputCls(!!errors.phone)} placeholder="+94 77 123 4567" />
                </Field>
                <Field label="Station Name" error={errors.station_name}>
                  <input value={form.station_name} onChange={(e) => setValue('station_name', e.target.value)} className={inputCls(!!errors.station_name)} placeholder="Colombo Station" />
                </Field>
                <Field label="Owner Name" error={errors.owner_name}>
                  <input value={form.owner_name} onChange={(e) => setValue('owner_name', e.target.value)} className={inputCls(!!errors.owner_name)} placeholder="Full name" />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4">
                <Field label="Country" error={errors.country}>
                  <select value={form.country} onChange={(e) => setValue('country', e.target.value)} className={inputCls(!!errors.country)}>
                    <option className="bg-[#18181C]" value="Sri Lanka">Sri Lanka</option>
                  </select>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Address Line 1" error={errors.address_line1}>
                    <input value={form.address_line1} onChange={(e) => setValue('address_line1', e.target.value)} className={inputCls(!!errors.address_line1)} placeholder="No, road, area" />
                  </Field>
                  <Field label="Address Line 2">
                    <input value={form.address_line2} onChange={(e) => setValue('address_line2', e.target.value)} className={inputCls(false)} placeholder="Optional" />
                  </Field>
                </div>

                {!form.custom_city ? (
                  <Field label="City" error={errors.city}>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                      <input value={form.city_search} onChange={(e) => setValue('city_search', e.target.value)} className={inputCls(!!errors.city, 'pl-9')} placeholder="Search city" />
                    </div>
                    {citiesQuery.data?.length ? (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#18181C]">
                        {citiesQuery.data.map((city) => (
                          <button key={`${city.source}-${city.id}`} type="button" onClick={() => selectCity(city)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5">
                            <span>{city.name}{city.sub_name ? ` - ${city.sub_name}` : ''}</span>
                            <span className="text-xs text-white/35">{city.district?.name}, {city.province?.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button type="button" onClick={() => setValue('custom_city', true)} className="text-left text-xs font-semibold text-[#E85D04] hover:text-[#F48C06]">
                      City not listed? Use custom city
                    </button>
                  </Field>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Custom City" error={errors.custom_city_name}>
                      <input value={form.custom_city_name} onChange={(e) => setValue('custom_city_name', e.target.value)} className={inputCls(!!errors.custom_city_name)} placeholder="City name" />
                    </Field>
                    <Field label="Province" error={errors.province_id}>
                      <select value={form.province_id} onChange={(e) => { setValue('province_id', e.target.value); setValue('district_id', '') }} className={inputCls(!!errors.province_id)}>
                        <option className="bg-[#18181C]" value="">Select</option>
                        {provincesQuery.data?.map((province) => <option key={province.id} className="bg-[#18181C]" value={province.id}>{province.name}</option>)}
                      </select>
                    </Field>
                    <Field label="District" error={errors.district_id}>
                      <select value={form.district_id} onChange={(e) => setValue('district_id', e.target.value)} className={inputCls(!!errors.district_id)} disabled={!form.province_id}>
                        <option className="bg-[#18181C]" value="">Select</option>
                        {districtsQuery.data?.map((district) => <option key={district.id} className="bg-[#18181C]" value={district.id}>{district.name}</option>)}
                      </select>
                    </Field>
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, custom_city: false, custom_city_name: '', province_id: '', district_id: '' }))} className="text-left text-xs font-semibold text-[#E85D04] hover:text-[#F48C06] sm:col-span-3">
                      Search official city list
                    </button>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="District">
                    <input value={form.custom_city ? districtsQuery.data?.find((district) => String(district.id) === form.district_id)?.name ?? '' : form.district_name} readOnly className={inputCls(false, 'text-white/60')} />
                  </Field>
                  <Field label="Province">
                    <input value={form.custom_city ? selectedProvince?.name ?? '' : form.province_name} readOnly className={inputCls(false, 'text-white/60')} />
                  </Field>
                  <Field label="Postal Code">
                    <input value={form.postal_code} onChange={(e) => setValue('postal_code', e.target.value)} className={inputCls(false)} placeholder="Optional" />
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <Field label="Owner Email" error={errors.owner_email}>
                  <input value={form.owner_email} onChange={(e) => setValue('owner_email', e.target.value)} className={inputCls(!!errors.owner_email)} placeholder="owner@email.com" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Password" error={errors.password}>
                    <input type="password" value={form.password} onChange={(e) => setValue('password', e.target.value)} className={inputCls(!!errors.password)} placeholder="Minimum 8 characters" />
                  </Field>
                  <Field label="Confirm Password" error={errors.confirm_password}>
                    <input type="password" value={form.confirm_password} onChange={(e) => setValue('confirm_password', e.target.value)} className={inputCls(!!errors.confirm_password)} placeholder="Repeat password" />
                  </Field>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5">
                <div className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/5 p-4">
                  <Mail size={18} className="mt-0.5 text-[#E85D04]" />
                  <p className="text-sm leading-6 text-white/55">
                    Enter the 6-digit code sent to <span className="font-semibold text-white">{maskedEmail}</span>.
                  </p>
                </div>
                <Field label="Verification Code" error={errors.code}>
                  <input value={form.code} onChange={(e) => setValue('code', e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputCls(!!errors.code, 'text-center text-lg tracking-[0.35em]')} placeholder="000000" />
                </Field>
                <button type="button" onClick={resendCode} disabled={isSubmitting} className="flex items-center gap-2 text-sm font-semibold text-[#E85D04] hover:text-[#F48C06] disabled:opacity-60">
                  <RefreshCw size={14} /> Resend code
                </button>
              </div>
            )}

            {step === 4 && complete && (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 size={44} className="text-[#E85D04]" />
                <h1 className="mt-4 font-syne text-2xl font-bold">Registration complete</h1>
                <p className="mt-2 text-sm text-white/50">Sign in with your station code and owner email.</p>
                <div className="mt-6 grid w-full max-w-sm gap-2 rounded-lg border border-white/8 bg-white/5 p-4 text-left text-sm">
                  <p><span className="text-white/35">Station:</span> {complete.station_name}</p>
                  <p><span className="text-white/35">Code:</span> {complete.station_code}</p>
                  <p><span className="text-white/35">Email:</span> {complete.owner_email}</p>
                </div>
                <button onClick={() => router.push('/login')} className="mt-6 h-11 rounded-lg bg-[#E85D04] px-5 font-semibold text-white hover:bg-[#F48C06]">
                  Go to login
                </button>
              </div>
            )}

            {apiError && (
              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/8 px-3.5 py-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-400" />
                <p className="text-sm leading-snug text-rose-400">{apiError}</p>
              </div>
            )}

            {step < 4 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" onClick={prevStep} disabled={step === 0 || isSubmitting} className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-semibold text-white/70 hover:bg-white/5 disabled:opacity-40">
                  <ChevronLeft size={15} /> Back
                </button>
                {step < 2 && (
                  <button type="button" onClick={nextStep} className="flex h-10 items-center gap-2 rounded-lg bg-[#E85D04] px-4 text-sm font-semibold text-white hover:bg-[#F48C06]">
                    Next <ChevronRight size={15} />
                  </button>
                )}
                {step === 2 && (
                  <button type="button" onClick={startRegistration} disabled={isSubmitting} className="flex h-10 items-center gap-2 rounded-lg bg-[#E85D04] px-4 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60">
                    {isSubmitting && <LoadingSpinner size="sm" className="border-white/40 border-t-white" />}
                    Send code
                  </button>
                )}
                {step === 3 && (
                  <button type="button" onClick={verifyRegistration} disabled={isSubmitting} className="flex h-10 items-center gap-2 rounded-lg bg-[#E85D04] px-4 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60">
                    {isSubmitting && <LoadingSpinner size="sm" className="border-white/40 border-t-white" />}
                    Verify
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
