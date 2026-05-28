import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// ─── Client ───────────────────────────────────────────────────────────────────

export const platformClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? 'http://localhost:4000/api/platform',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Error message extraction ─────────────────────────────────────────────────

export function extractPlatformError(err: unknown): string {
  const axErr = err as AxiosError<Record<string, unknown>>
  if (!axErr.response) return 'Unable to reach server'
  const data = axErr.response.data
  if (data) {
    const msg = data.message ?? data.error
    if (typeof msg === 'string') return msg
    if (Array.isArray(msg) && typeof msg[0] === 'string') return msg[0]
  }
  if (axErr.response.status === 403) return "You don't have permission to do this"
  if (axErr.response.status === 429)
    return 'Too many requests — please wait before trying again'
  if (axErr.response.status >= 500)
    return 'Server error — please try again later'
  return 'Something went wrong'
}

// ─── 401 → refresh → retry ───────────────────────────────────────────────────

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let isRefreshing = false
let waitQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function flushQueue(err: unknown) {
  waitQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(null)))
  waitQueue = []
}

// ─── snake_case → camelCase normaliser ───────────────────────────────────────
// Backend applies SnakeCaseInterceptor globally (main.ts:20).
// This must be the FIRST response interceptor so all downstream code sees camelCase.

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function camelizeKeys(val: unknown): unknown {
  if (val === null || val === undefined) return val
  if (val instanceof Date) return val
  if (Array.isArray(val)) return val.map(camelizeKeys)
  if (typeof val === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[snakeToCamel(k)] = camelizeKeys(v)
    }
    return out
  }
  return val
}

platformClient.interceptors.response.use((res) => {
  res.data = camelizeKeys(res.data)
  return res
})

// ─── Paginated response normaliser ───────────────────────────────────────────
// Backend returns { data, total, page, limit, pages }.
// Frontend expects { data, meta: { total, page, limit } }.

platformClient.interceptors.response.use((res) => {
  const d = res.data
  if (
    d &&
    typeof d === 'object' &&
    !Array.isArray(d) &&
    Array.isArray((d as Record<string, unknown>).data) &&
    typeof (d as Record<string, unknown>).total === 'number' &&
    typeof (d as Record<string, unknown>).page === 'number' &&
    typeof (d as Record<string, unknown>).limit === 'number' &&
    !(d as Record<string, unknown>).meta
  ) {
    const flat = d as { data: unknown[]; total: number; page: number; limit: number }
    res.data = { data: flat.data, meta: { total: flat.total, page: flat.page, limit: flat.limit } }
  }
  return res
})

platformClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as RetryableConfig | undefined
    const isAuthEndpoint = config?.url?.startsWith('/auth/')
    const already401Retried = config?._retry

    if (
      err.response?.status !== 401 ||
      isAuthEndpoint ||
      already401Retried ||
      !config
    ) {
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject })
      }).then(() => platformClient(config))
    }

    config._retry = true
    isRefreshing = true

    try {
      await platformClient.post('/auth/refresh')
      flushQueue(null)
      return platformClient(config)
    } catch (refreshErr) {
      flushQueue(refreshErr)
      if (typeof window !== 'undefined') {
        window.location.href = '/platform/login'
      }
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

// ─── Typed API groups ─────────────────────────────────────────────────────────

export const platformApi = {
  auth: {
    login: (data: { email: string; password: string }) =>
      platformClient.post('/auth/login', data),
    logout: () => platformClient.post('/auth/logout'),
    me: () => platformClient.get('/auth/me'),
    forgotPassword: (email: string) =>
      platformClient.post('/auth/forgot-password', { email }),
    resetPassword: (data: {
      token: string
      new_password: string
      confirm_password: string
    }) => platformClient.post('/auth/reset-password', data),
    updateProfile: (data: { name: string }) =>
      platformClient.patch('/auth/me', data),
    changePassword: (data: {
      current_password: string
      new_password: string
      confirm_password: string
    }) => platformClient.post('/auth/change-password', data),
    getSessions: () => platformClient.get('/auth/sessions'),
    revokeSession: (sessionId: string) =>
      platformClient.delete(`/auth/sessions/${sessionId}`),
    revokeAllSessions: () => platformClient.delete('/auth/sessions'),
  },

  mfa: {
    setupTotp: () => platformClient.post('/auth/mfa/totp/setup'),
    activateTotp: (data: { totp_code: string }) =>
      platformClient.post('/auth/mfa/totp/activate', data),
    disableTotp: (data: { code: string; password: string }) =>
      platformClient.post('/auth/mfa/totp/disable', data),
    sendEmailOtp: () => platformClient.post('/auth/mfa/email/send'),
    verifyEmailOtp: (data: { code: string }) =>
      platformClient.post('/auth/mfa/email/verify', data),
    verifyTotpLogin: (data: { temp_token: string; code: string }) =>
      platformClient.post('/auth/mfa/verify-login', { ...data, method: 'totp' }),
    verifyEmailOtpLogin: (data: { temp_token: string; code: string }) =>
      platformClient.post('/auth/mfa/verify-login', { ...data, method: 'email' }),
    sendEmailOtpLogin: (data: { temp_token: string }) =>
      platformClient.post('/auth/mfa/email/send-login', data),
    verifyBackupLogin: (data: { temp_token: string; code: string }) =>
      platformClient.post('/auth/mfa/verify-login', { ...data, method: 'backup' }),
  },

  tenants: {
    list: (params?: Record<string, unknown>) =>
      platformClient.get('/tenants', { params }),
    get: (id: string) => platformClient.get(`/tenants/${id}`),
    create: (data: Record<string, unknown>) =>
      platformClient.post('/tenants', data),
    update: (id: string, data: Record<string, unknown>) =>
      platformClient.patch(`/tenants/${id}`, data),
    changeStatus: (id: string, data: { status: string; reason?: string }) =>
      platformClient.patch(`/tenants/${id}/status`, data),
    updateSettings: (
      id: string,
      data: { settings: Record<string, unknown> },
    ) => platformClient.patch(`/tenants/${id}/settings`, data),
    getStats: (id: string) => platformClient.get(`/tenants/${id}/stats`),
    getUsers: (id: string, params?: Record<string, unknown>) =>
      platformClient.get(`/tenants/${id}/users`, { params }),
    getActivity: (id: string, params?: Record<string, unknown>) =>
      platformClient.get(`/tenants/${id}/activity`, { params }),
    getSessions: (id: string) =>
      platformClient.get(`/tenants/${id}/sessions`),
    revokeSession: (tenantId: string, sessionId: string) =>
      platformClient.delete(`/tenants/${tenantId}/sessions/${sessionId}`),
    resetSessions: (id: string) =>
      platformClient.post(`/tenants/${id}/reset-sessions`),
  },

  admins: {
    list: (params?: Record<string, unknown>) =>
      platformClient.get('/admins', { params }),
    get: (id: string) => platformClient.get(`/admins/${id}`),
    invite: (data: { email: string; name: string; platform_role: string }) =>
      platformClient.post('/admins/invite', data),
    acceptInvite: (data: {
      token: string
      name: string
      password: string
      confirm_password: string
    }) => platformClient.post('/admins/invite/accept', data),
    update: (id: string, data: { name: string }) =>
      platformClient.patch(`/admins/${id}`, data),
    changeRole: (id: string, data: { platform_role: string }) =>
      platformClient.patch(`/admins/${id}/role`, data),
    changeStatus: (id: string, data: { status: string; reason?: string }) =>
      platformClient.patch(`/admins/${id}/status`, data),
    remove: (id: string) => platformClient.delete(`/admins/${id}`),
    resetPassword: (id: string) =>
      platformClient.post(`/admins/${id}/reset-password`),
    getSessions: (id: string) =>
      platformClient.get(`/admins/${id}/sessions`),
    revokeSession: (adminId: string, sessionId: string) =>
      platformClient.delete(`/admins/${adminId}/sessions/${sessionId}`),
    revokeSessions: (id: string) =>
      platformClient.delete(`/admins/${id}/sessions`),
    getActivity: (id: string, params?: Record<string, unknown>) =>
      platformClient.get(`/admins/${id}/activity`, { params }),
  },

  registrations: {
    list: (params?: Record<string, unknown>) =>
      platformClient.get('/registrations', { params }),
    get: (id: string) => platformClient.get(`/registrations/${id}`),
    approve: (id: string) =>
      platformClient.post(`/registrations/${id}/approve`),
    reject: (id: string, data: { reason?: string }) =>
      platformClient.post(`/registrations/${id}/reject`, data),
    resend: (id: string) =>
      platformClient.post(`/registrations/${id}/resend`),
  },

  alerts: {
    list: (params?: Record<string, unknown>) =>
      platformClient.get('/alerts', { params }),
    acknowledge: (id: string) =>
      platformClient.patch(`/alerts/${id}/acknowledge`),
    acknowledgeAll: () => platformClient.patch('/alerts/acknowledge-all'),
  },

  settings: {
    get: () => platformClient.get('/settings'),
    update: (data: Record<string, unknown>) =>
      platformClient.patch('/settings', data),
  },

  dashboard: {
    getStats: () => platformClient.get('/dashboard/stats'),
    getTenantGrowth: () => platformClient.get('/dashboard/tenant-growth'),
    getRecentActivity: () => platformClient.get('/dashboard/recent-activity'),
    getStatusDistribution: () =>
      platformClient.get('/dashboard/status-distribution'),
    getRecentTenants: () => platformClient.get('/dashboard/recent-tenants'),
  },

  activityLogs: {
    list: (params?: Record<string, unknown>) =>
      platformClient.get('/activity-logs', { params }),
  },

  systemHealth: {
    get: () => platformClient.get('/system-health'),
  },
}
