'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from '@/providers/ThemeProvider'
import { format } from 'date-fns'
import { Sun, Moon, Menu, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'

// ─── Breadcrumb label map ─────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  '':                  'Dashboard',
  'shifts':            'Shifts',
  'sessions':          'Sessions',
  'attendance':        'Attendance',
  'inventory':         'Stock Balances',
  'movements':         'Stock Movements',
  'night-verify':      'Night Verify',
  'bowser-receipts':   'Bowser Receipts',
  'stock-orders':      'Stock Orders',
  'cash':              'Cash & Balancing',
  'credits':           'Credits & Dues',
  'cheques':           'Cheques',
  'payroll':           'Payroll',
  'reports':           'Reports',
  'shift-summary':     'Shift Summary',
  'stock':             'Stock Report',
  'pumper-shortfalls': 'Pumper Shortfalls',
  'profit-loss':       'P&L',
  'cpc-stock':         'CPC Stock',
  'audit-logs':        'Audit Logs',
  'tenants':           'Tenants',
  'pumps':             'Pumps',
  'settings':          'Settings',
  'products':          'Products & Prices',
  'staff':             'Staff',
}

function label(seg: string) {
  return SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function useBreadcrumbs(pathname: string) {
  if (pathname === '/') return [{ label: 'Dashboard' }]

  const segments = pathname.split('/').filter(Boolean)
  return segments.map((seg) => ({ label: label(seg) }))
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { user } = useAuth()

  const crumbs = useBreadcrumbs(pathname)
  const today = format(new Date(), 'EEEE, d MMM yyyy')

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-[#0A0A0B] px-4 md:px-6">
      {/* Left: hamburger (mobile) + breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="mr-1 rounded p-1.5 text-white/40 hover:text-white/70 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <nav className="flex items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-white/20" />}
              <span
                className={
                  i === crumbs.length - 1
                    ? 'font-medium text-white/80'
                    : 'text-white/35'
                }
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Center: business date */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
        <p className="font-syne text-sm font-semibold text-white/60">{today}</p>
      </div>

      {/* Right: station name + theme toggle */}
      <div className="flex items-center gap-2">
        {user?.tenant?.station_name && (
          <span className="hidden text-xs text-white/30 md:block">
            {user.tenant.station_name}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/40 hover:text-white/80"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </Button>
      </div>
    </header>
  )
}
