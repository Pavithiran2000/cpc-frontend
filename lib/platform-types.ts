// ─── Enums ────────────────────────────────────────────────────────────────────

export type PlatformRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT'
export type PlatformAdminStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type MfaMethod = 'TOTP' | 'EMAIL' | 'BOTH'
export type PlatformTenantStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
// ─── Admin ────────────────────────────────────────────────────────────────────

export interface PlatformAdmin {
  id: string
  email: string
  name: string
  platformRole: PlatformRole
  status: PlatformAdminStatus
  lastLoginAt: string | null
  twoFactorEnabled: boolean
  mfaMethod: MfaMethod | null
  // Optional — not returned by list endpoint; present in detail/extended responses
  createdAt?: string
  updatedAt?: string
  invitedBy?: string | null
  invitedByEmail?: string | null
  invitedByName?: string | null
}

export interface AdminSession {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  lastActiveAt: string | null
  expiresAt: string | null
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export interface TenantSummary {
  id: string
  stationName: string
  stationCode: string
  ownerName: string | null
  district: string | null
  address: string | null
  contactNumber: string | null
  email: string | null
  status: PlatformTenantStatus
  createdAt: string
  updatedAt: string
}

export interface TenantDetail extends TenantSummary {
  settings: Record<string, string | null>
  counts: {
    portalUsers: number
    shiftSessions: number
    staffProfiles: number
  }
}

export interface TenantStats {
  totalStaff: number
  totalShifts: number
  totalProducts: number
  activeSessions: number
  lastActivity: string | null
}

export interface TenantSession {
  id: string
  userId: string
  userEmail: string
  userName: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  lastActiveAt: string | null
  expiresAt: string | null
}

// ─── Registrations ────────────────────────────────────────────────────────────

export interface RegistrationAttempt {
  id: string
  email: string
  name: string
  stationCode: string
  stationName: string
  district: string | null
  contactNumber: string | null
  address: string | null
  status: RegistrationStatus
  reviewedAt: string | null
  reviewedByEmail: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface PlatformAlert {
  id: string
  type: string
  severity: AlertSeverity
  message: string
  acknowledged: boolean
  acknowledgedAt: string | null
  acknowledgedByEmail: string | null
  createdAt: string
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface PlatformActivityLog {
  id: string
  adminId: string | null
  adminEmail: string | null
  action: string
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  suspendedTenants: number
  totalPortalUsers: number
  newTenantsThisMonth: number
  newTenantsLastMonth: number
  newTenantsChangePct: number | null
  activeSessions: number
  // _24h has a numeral after the last underscore so camelizer leaves it as-is
  failedLogins_24h: number
}

export interface TenantGrowthPoint {
  month: string
  newTenants: number
  cumulative: number
}

export interface StatusDistribution {
  status: PlatformTenantStatus
  count: number
}

// ─── System health ────────────────────────────────────────────────────────────

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  nodeVersion: string
  services: {
    database: { status: string; latencyMs: number }
    memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number }
  }
  metrics: {
    uptimeSeconds: number
    activePlatformSessions: number
    totalTenants: number
    apiRequestsToday: number
    failedLoginsToday: number
    // numeral after last underscore: camelizer leaves _1min as-is
    cpuLoad_1min: number
    cpuCount: number
  }
}

// ─── Platform settings ────────────────────────────────────────────────────────

export interface PlatformSettings {
  maintenance_mode: boolean
  registration_enabled: boolean
  max_tenants: number | null
  default_tenant_status: PlatformTenantStatus
  session_timeout_hours: number
  mfa_required: boolean
  [key: string]: unknown
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}
