import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  change?: number
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'fuel'
  isLoading?: boolean
  className?: string
}

const CARD_CLS: Record<string, string> = {
  default: 'border-border',
  success: 'border-emerald-500/20',
  warning: 'border-amber-500/20',
  danger:  'border-rose-500/20',
  fuel:    'border-border',
}

const ICON_CLS: Record<string, string> = {
  default: 'text-foreground/30',
  success: 'text-emerald-500 dark:text-emerald-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger:  'text-rose-500 dark:text-rose-400',
  fuel:    'text-[#E85D04]',
}

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  variant = 'default',
  isLoading,
  className,
}: StatCardProps) {
  const isFuel = variant === 'fuel'

  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-lg border bg-card p-4',
          CARD_CLS[variant] ?? CARD_CLS.default,
          isFuel && 'border-l-[3px]',
          className,
        )}
        style={isFuel ? { borderLeftColor: '#E85D04' } : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="h-3 w-28 rounded bg-foreground/10" />
          <div className="h-5 w-5 rounded bg-foreground/10" />
        </div>
        <div className="mt-3 h-8 w-36 rounded bg-foreground/10" />
        <div className="mt-2 h-3 w-16 rounded bg-foreground/10" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4',
        CARD_CLS[variant] ?? CARD_CLS.default,
        isFuel && 'border-l-[3px]',
        className,
      )}
      style={isFuel ? { borderLeftColor: '#E85D04' } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-foreground/40">
          {title}
        </span>
        <Icon
          size={18}
          className={cn('mt-0.5 shrink-0', ICON_CLS[variant] ?? ICON_CLS.default)}
        />
      </div>

      <div className="number mt-3 text-2xl font-bold text-foreground">{value}</div>

      {change !== undefined && (
        <div
          className={cn(
            'number mt-1.5 flex items-center gap-0.5 text-xs',
            change > 0 && 'text-emerald-500 dark:text-emerald-400',
            change < 0 && 'text-rose-500 dark:text-rose-400',
            change === 0 && 'text-foreground/35',
          )}
        >
          <span>{change > 0 ? '▲' : change < 0 ? '▼' : '—'}</span>
          <span>
            {change === 0 ? '0.0' : Math.abs(change).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}
