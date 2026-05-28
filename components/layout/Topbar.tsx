'use client'

import { usePathname } from 'next/navigation'
import { useTheme } from '@/providers/ThemeProvider'
import { format } from 'date-fns'
import { Sun, Moon, Monitor, Menu, ChevronRight } from 'lucide-react'
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

// ─── Theme cycle: light → dark → system → light ───────────────────────────────

function nextTheme(current: 'dark' | 'light' | 'system'): 'dark' | 'light' | 'system' {
  if (current === 'dark')   return 'light'
  if (current === 'light')  return 'system'
  return 'dark'
}

function ThemeIcon({ theme }: { theme: 'dark' | 'light' | 'system' }) {
  if (theme === 'dark')   return <Moon size={15} />
  if (theme === 'light')  return <Sun  size={15} />
  return <Monitor size={15} />
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  const crumbs = useBreadcrumbs(pathname)
  const today = format(new Date(), 'EEEE, d MMM yyyy')

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      {/* Left: hamburger (mobile) + breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="mr-1 rounded p-1.5 text-foreground/40 hover:text-foreground/70 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <nav className="flex items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-foreground/20" />}
              <span
                className={
                  i === crumbs.length - 1
                    ? 'font-medium text-foreground/80'
                    : 'text-foreground/35'
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
        <p className="font-syne text-sm font-semibold text-foreground/60">{today}</p>
      </div>

      {/* Right: station name + theme toggle */}
      <div className="flex items-center gap-2">
        {user?.tenant?.station_name && (
          <span className="hidden text-xs text-foreground/30 md:block">
            {user.tenant.station_name}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground/40 hover:text-foreground/80"
          onClick={() => setTheme(nextTheme(theme))}
          aria-label={`Current theme: ${theme}. Click to switch.`}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon theme={theme} />
        </Button>
      </div>
    </header>
  )
}
