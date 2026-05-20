import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  // Green — positive / complete
  ACTIVE:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OPEN:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  APPROVED:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CLEARED:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  SETTLED:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  APPLIED:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',

  // Yellow — in-flight / pending
  PENDING:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DRAFT:       'bg-amber-500/10 text-amber-400 border-amber-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RECEIVED:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DEPOSITED:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PARTIAL:     'bg-amber-500/10 text-amber-400 border-amber-500/20',

  // Gray — terminal / neutral
  CLOSED:    'bg-white/5 text-white/40 border-white/10',
  INACTIVE:  'bg-white/5 text-white/40 border-white/10',
  FINALIZED: 'bg-white/5 text-white/40 border-white/10',

  // Red — failure / cancellation
  CANCELLED:  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  REJECTED:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  BOUNCED:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
  RETURNED:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  SHORTFALL:  'bg-rose-500/10 text-rose-400 border-rose-500/20',

  // Blue — submitted externally
  SUBMITTED: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
}

const FALLBACK = 'bg-white/5 text-white/40 border-white/10'

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
