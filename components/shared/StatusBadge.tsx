import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  // Green — positive / complete
  ACTIVE:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20',
  OPEN:      'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20',
  APPROVED:  'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20',
  CLEARED:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20',
  SETTLED:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20',
  APPLIED:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20',

  // Yellow — in-flight / pending
  PENDING:     'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 dark:border-amber-500/20',
  DRAFT:       'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 dark:border-amber-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 dark:border-amber-500/20',
  RECEIVED:    'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 dark:border-amber-500/20',
  DEPOSITED:   'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 dark:border-amber-500/20',
  PARTIAL:     'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 dark:border-amber-500/20',

  // Neutral — terminal / inactive
  CLOSED:    'bg-foreground/5 text-foreground/45 border-border',
  INACTIVE:  'bg-foreground/5 text-foreground/45 border-border',
  FINALIZED: 'bg-foreground/5 text-foreground/45 border-border',

  // Red — failure / cancellation
  CANCELLED:  'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 dark:border-rose-500/20',
  REJECTED:   'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 dark:border-rose-500/20',
  BOUNCED:    'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 dark:border-rose-500/20',
  RETURNED:   'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 dark:border-rose-500/20',
  SHORTFALL:  'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 dark:border-rose-500/20',

  // Blue — submitted externally
  SUBMITTED: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400 dark:border-sky-500/20',
}

const FALLBACK = 'bg-foreground/5 text-foreground/45 border-border'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? FALLBACK

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles,
        className,
      )}
    >
      {status}
    </span>
  )
}
