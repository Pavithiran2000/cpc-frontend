'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  LayoutDashboard,
  CalendarClock,
  UserCheck,
  Layers,
  ArrowLeftRight,
  Truck,
  ShoppingCart,
  Moon,
  Wallet,
  CreditCard,
  CheckSquare,
  DollarSign,
  BarChart2,
  PackageSearch,
  TrendingDown,
  PieChart,
  ClipboardList,
  Building2,
  Activity,
  Fuel,
  Tag,
  Clock,
  Users,
  LogOut,
  Settings2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Nav schema ───────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  adminOnly?: boolean
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Dashboard',      href: '/',                    icon: LayoutDashboard },
      { label: 'Shift Sessions', href: '/shifts/sessions',     icon: CalendarClock   },
      { label: 'Attendance',     href: '/shifts/attendance',   icon: UserCheck       },
    ],
  },
  {
    label: 'INVENTORY',
    items: [
      { label: 'Stock Balances',  href: '/inventory',               icon: Layers         },
      { label: 'Stock Movements', href: '/inventory/movements',      icon: ArrowLeftRight  },
      { label: 'Bowser Receipts', href: '/bowser-receipts',          icon: Truck           },
      { label: 'Stock Orders',    href: '/stock-orders',             icon: ShoppingCart    },
      { label: 'Night Verify',    href: '/inventory/night-verify',   icon: Moon            },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { label: 'Cash & Balancing', href: '/cash',     icon: Wallet      },
      { label: 'Credits & Dues',   href: '/credits',  icon: CreditCard  },
      { label: 'Cheques',          href: '/cheques',  icon: CheckSquare },
      { label: 'Payroll',          href: '/payroll',  icon: DollarSign  },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { label: 'Shift Summary',      href: '/reports/shift-summary',      icon: BarChart2    },
      { label: 'Stock Report',       href: '/reports/stock',              icon: PackageSearch },
      { label: 'Pumper Shortfalls',  href: '/reports/pumper-shortfalls',  icon: TrendingDown  },
      { label: 'P&L',                href: '/reports/profit-loss',        icon: PieChart      },
      { label: 'CPC Stock',          href: '/reports/cpc-stock',          icon: ClipboardList },
    ],
  },
  {
    label: 'ADMIN',
    adminOnly: true,
    items: [
      { label: 'Tenants',    href: '/tenants',            icon: Building2 },
      { label: 'Audit Logs', href: '/reports/audit-logs', icon: Activity  },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { label: 'Pumps',             href: '/pumps',             icon: Fuel  },
      { label: 'Products & Prices', href: '/settings/products', icon: Tag   },
      { label: 'Shift Templates',   href: '/settings/shifts',   icon: Clock },
      { label: 'Staff',             href: '/staff',             icon: Users },
    ],
  },
]

// All hrefs used for active-item calculation
const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (pathname === href) return true
  if (!pathname.startsWith(href + '/')) return false
  // Yield to a more-specific sibling if one matches
  return !ALL_HREFS.some(
    (h) => h !== href && h.startsWith(href + '/') && pathname.startsWith(h),
  )
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}) {
  const active = isItemActive(pathname, item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 rounded-r-md border-l-[3px] py-1.5 pl-3 pr-3 text-sm transition-colors',
        active
          ? 'border-[#E85D04] bg-[rgba(232,93,4,0.10)] text-[#E85D04]'
          : 'border-transparent text-white/45 hover:border-white/10 hover:bg-white/4 hover:text-white/75',
      )}
    >
      <Icon size={14} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()

  const initials = (user?.name ?? '??')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#0A0A0B]">
      {/* ── Logo ── */}
      <div className="flex h-14 items-center gap-3 border-b border-white/6 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E85D04]">
          <Fuel size={13} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-syne text-sm font-bold tracking-widest text-[#E85D04] uppercase">
            CPC
          </p>
          <p className="truncate text-[10px] text-white/35 leading-none">
            {user?.tenant?.station_name ?? 'Station Manager'}
          </p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-1.5 py-3">
        {NAV_GROUPS.map((group) => {
          if (group.adminOnly && !isAdmin()) return null

          return (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-widest text-white/25 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-white/6 px-3 py-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E85D04]/20 text-xs font-semibold text-[#E85D04]">
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-white/70">{user?.email}</p>
            <span
              className={cn(
                'mt-0.5 inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium',
                user?.portal_role === 'ADMIN'
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-sky-500/15 text-sky-400',
              )}
            >
              {user?.portal_role ?? '—'}
            </span>
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            title="Settings"
            className={cn(
              'shrink-0 rounded p-1.5 transition-colors hover:bg-white/5',
              pathname.startsWith('/settings')
                ? 'text-[#E85D04]'
                : 'text-white/30 hover:text-white/70',
            )}
          >
            <Settings2 size={13} />
          </Link>

          {/* Logout */}
          <button
            onClick={() => logout()}
            title="Sign out"
            className="shrink-0 rounded p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-rose-400"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
