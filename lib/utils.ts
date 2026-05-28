import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatLitres(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-LK', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' L'
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-LK')
}

export function formatRelativeTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day}d ago`
  return formatDate(date)
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

const ACTION_LABELS: Record<string, string> = {
  TENANT_CREATED:          'Created tenant',
  TENANT_UPDATED:          'Updated tenant',
  TENANT_STATUS_CHANGED:   'Changed tenant status',
  TENANT_SETTINGS_UPDATED: 'Updated tenant settings',
  TENANT_SESSIONS_RESET:   'Reset tenant sessions',
  ADMIN_INVITED:           'Invited platform admin',
  ADMIN_UPDATED:           'Updated admin profile',
  ADMIN_STATUS_CHANGED:    'Changed admin status',
  ADMIN_ROLE_CHANGED:      'Changed admin role',
  ADMIN_SESSIONS_REVOKED:  'Revoked admin sessions',
  ADMIN_PASSWORD_RESET:    'Reset admin password',
  ADMIN_DELETED:           'Deleted admin',
  PASSWORD_RESET:          'Reset password',
  PASSWORD_CHANGED:        'Changed password',
  PROFILE_UPDATED:         'Updated profile',
  MFA_TOTP_ENABLED:        'Enabled MFA (TOTP)',
  MFA_DISABLED:            'Disabled MFA',
  PLATFORM_LOGIN:          'Logged in',
  PLATFORM_LOGOUT:         'Logged out',
  LOGIN_MFA_VERIFIED:      'Completed MFA login',
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.toLowerCase().replace(/_/g, ' ')
}
