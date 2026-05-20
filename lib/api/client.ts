import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,              // sends httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor ─────────────────────────────────────────────────────
// Cookies are automatic via withCredentials; no Authorization header needed.
api.interceptors.request.use((config) => config)

// ─── 401 → refresh → retry ───────────────────────────────────────────────────
// Auth endpoints (/auth/*) bypass the refresh loop:
//   • /auth/me     401 → user is not logged in; AuthProvider returns null
//   • /auth/refresh 401 → refresh cookie also expired; redirect to /login
// All other 401s attempt one token refresh, then retry the original request.

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let isRefreshing = false
let waitQueue: Array<{
  resolve: (value: unknown) => void
  reject:  (reason?: unknown) => void
}> = []

function flushQueue(err: unknown) {
  waitQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(null)))
  waitQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as RetryableConfig | undefined

    const isAuthEndpoint = config?.url?.startsWith('/auth/')
    const already401Retried = config?._retry

    if (err.response?.status !== 401 || isAuthEndpoint || already401Retried || !config) {
      return Promise.reject(err)
    }

    // Queue concurrent requests while a refresh is in-flight
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject })
      }).then(() => api(config))
    }

    config._retry = true
    isRefreshing = true

    try {
      await api.post('/auth/refresh')
      flushQueue(null)
      return api(config)
    } catch (refreshErr) {
      flushQueue(refreshErr)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)
