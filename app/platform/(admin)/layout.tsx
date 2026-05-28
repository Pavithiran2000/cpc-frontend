'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Building2,
  Users,
  Activity,
  Server,
  UserCircle,
  LogOut,
  ChevronRight,
  Shield,
  ClipboardList,
  AlertTriangle,
  Bell,
  FileBarChart2,
  Settings,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Toaster } from '@/components/ui/sonner'
import { platformApi } from '@/lib/platform-api'
import type { SystemHealth } from '@/lib/platform-types'

// ─── Nav schema ───────────────────────────────────────────────────────────────

type NavRole = 'all' | 'admin' | 'superAdmin'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  role?: NavRole
  badge?: 'registrations' | 'alerts'
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'PLATFORM',
    items: [
      { label: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { label: 'Tenants',       href: '/platform/tenants',       icon: Building2,     },
      { label: 'Registrations', href: '/platform/registrations', icon: ClipboardList,  badge: 'registrations' },
      { label: 'Admins',        href: '/platform/admins',        icon: Users,          role: 'superAdmin' },
    ],
  },
  {
    label: 'MONITORING',
    items: [
      { label: 'Security Events', href: '/platform/security',      icon: AlertTriangle },
      { label: 'Alerts',          href: '/platform/alerts',        icon: Bell,          badge: 'alerts' },
      { label: 'Activity Logs',   href: '/platform/activity-logs', icon: Activity      },
      { label: 'System Health',   href: '/platform/system-health', icon: Server,        role: 'superAdmin' },
    ],
  },
  {
    label: 'REPORTS & CONFIG',
    items: [
      { label: 'Reports', href: '/platform/reports', icon: FileBarChart2 },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Settings', href: '/platform/settings', icon: UserCircle },
    ],
  },
]

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({
  item,
  pathname,
  onClick,
  badgeCount,
}: {
  item: NavItem
  pathname: string
  onClick?: () => void
  badgeCount?: number
}) {
  const active =
    item.href === '/platform/dashboard'
      ? pathname === '/platform/dashboard'
      : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-r-md border-l-[3px] py-1.5 pl-3 pr-3 text-sm transition-colors',
        active
          ? 'border-[#E85D04] bg-[rgba(232,93,4,0.10)] text-[#E85D04]'
          : 'border-transparent text-white/45 hover:border-white/10 hover:bg-white/4 hover:text-white/75',
      )}
    >
      <Icon size={14} className="shrink-0" />
      <span className="truncate flex-1">{item.label}</span>
      {!!badgeCount && badgeCount > 0 && (
        <span className="ml-auto rounded-full bg-[#E85D04]/20 px-1.5 py-px text-[9px] font-bold text-[#E85D04]">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  )
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()
  const { admin, logout, hasRole } = usePlatformAuth()

  const initials = (admin?.name ?? '??')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const roleBadgeColor = {
    SUPER_ADMIN: 'bg-rose-500/15 text-rose-400',
    ADMIN: 'bg-sky-500/15 text-sky-400',
    SUPPORT: 'bg-emerald-500/15 text-emerald-400',
  }[admin?.platformRole ?? 'SUPPORT'] ?? 'bg-emerald-500/15 text-emerald-400'

  const regBadgeQ = useQuery({
    queryKey: ['platform', 'sidebar', 'pending-regs'],
    queryFn: () =>
      platformApi.registrations
        .list({ status: 'PENDING', limit: 1 })
        .then((r) => (r.data as { meta: { total: number } }).meta?.total ?? 0)
        .catch(() => 0),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const alertBadgeQ = useQuery({
    queryKey: ['platform', 'sidebar', 'unread-alerts'],
    queryFn: () =>
      platformApi.alerts
        .list({ acknowledged: false, limit: 1 })
        .then((r) => (r.data as { meta: { total: number } }).meta?.total ?? 0)
        .catch(() => 0),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const badgeCounts: Record<string, number> = {
    registrations: regBadgeQ.data ?? 0,
    alerts: alertBadgeQ.data ?? 0,
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-white/6 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E85D04]">
          <Shield size={13} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-syne text-sm font-bold uppercase tracking-widest text-[#E85D04]">
            CPC Platform
          </p>
          <p className="truncate text-[10px] leading-none text-white/35">
            Admin Console
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-1.5 py-3">
        <div className="space-y-4">
          {NAV_GROUPS.map((group) => {
            const visible = group.items.filter((item) => {
              if (item.role === 'superAdmin') return hasRole('SUPER_ADMIN')
              if (item.role === 'admin') return hasRole('ADMIN')
              return true
            })
            if (visible.length === 0) return null
            return (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visible.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onClick={onNavClick}
                      badgeCount={item.badge ? badgeCounts[item.badge] : undefined}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/6 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E85D04]/20 text-xs font-semibold text-[#E85D04]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-white/70">{admin?.name}</p>
            <p className="truncate text-[10px] text-white/35">{admin?.email}</p>
            <span className={cn('mt-0.5 inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium', roleBadgeColor)}>
              {admin?.platformRole ?? '—'}
            </span>
          </div>
          <Link
            href="/platform/settings"
            title="Account Settings"
            className="shrink-0 rounded p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            <UserCircle size={13} />
          </Link>
          <button
            onClick={() => logout()}
            title="Sign out"
            className="shrink-0 rounded p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-rose-400"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Breadcrumb label map ─────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  dashboard:       'Dashboard',
  tenants:         'Tenants',
  registrations:   'Registrations',
  admins:          'Admins',
  security:        'Security Events',
  alerts:          'Alerts',
  'activity-logs': 'Activity Logs',
  'system-health': 'System Health',
  reports:         'Reports',
  settings:        'Settings',
  profile:         'Profile',
  invite:          'Invite',
  accept:          'Accept',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Topbar ───────────────────────────────────────────────────────────────────

function PlatformTopbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { admin } = usePlatformAuth()

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const crumbs = pathname
    .replace('/platform/', '')
    .split('/')
    .filter(Boolean)
    .filter((seg) => !UUID_RE.test(seg))
    .map((seg) => SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))

  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  const ThemeIcon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon

  const healthQ = useQuery<string>({
    queryKey: ['platform', 'topbar', 'health'],
    queryFn: () =>
      platformApi.systemHealth.get().then((r) => (r.data as SystemHealth).status),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const adminInitials = (admin?.name ?? '??')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/50 hover:bg-foreground/5 hover:text-foreground lg:hidden"
        >
          <Menu size={18} />
        </button>

        <nav className="flex items-center gap-1.5 text-sm text-foreground/40">
          <span>Platform</span>
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight size={13} />
              <span className={i === crumbs.length - 1 ? 'font-medium text-foreground' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Date */}
        <span className="hidden font-syne text-sm text-foreground/40 md:block">{today}</span>

        {/* System health chip */}
        {healthQ.data && (
          <span className={cn(
            'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex',
            healthQ.data === 'healthy'  && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            healthQ.data === 'degraded' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            !['healthy', 'degraded'].includes(healthQ.data) && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              healthQ.data === 'healthy'  ? 'bg-emerald-500' :
              healthQ.data === 'degraded' ? 'bg-amber-400'   : 'bg-rose-500',
            )} />
            {healthQ.data}
          </span>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(nextTheme)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
          title={`Theme: ${theme} → ${nextTheme}`}
        >
          <ThemeIcon size={15} />
        </button>

        {/* Admin avatar */}
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E85D04]/15 text-[10px] font-bold text-[#E85D04]">
            {adminInitials}
          </div>
          <span className="max-w-[140px] truncate text-xs text-foreground/50">{admin?.email}</span>
        </div>
      </div>
    </header>
  )
}

// ─── Mobile nav drawer ────────────────────────────────────────────────────────

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col lg:hidden"
        style={{ background: '#0A0A0B' }}
      >
        <div className="absolute right-3 top-3">
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/30 hover:bg-white/5 hover:text-white/60"
          >
            <X size={14} />
          </button>
        </div>
        <SidebarContent onNavClick={onClose} />
      </aside>
    </>
  )
}

// ─── Protected layout ─────────────────────────────────────────────────────────

function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = usePlatformAuth()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace('/platform/login')
    }
  }, [initialized, isAuthenticated, router])

  if (!initialized || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0A0A0B' }}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className="hidden h-screen w-64 shrink-0 flex-col lg:flex"
        style={{ background: '#0A0A0B' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile nav drawer */}
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PlatformTopbar onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>

      <Toaster />
    </div>
  )
}

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <PlatformAdminShell>{children}</PlatformAdminShell>
    </ThemeProvider>
  )
}
