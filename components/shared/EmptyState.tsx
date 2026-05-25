import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  message: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && <Icon size={32} className="text-foreground/15" strokeWidth={1.5} />}
      <p className="mt-3 text-sm text-foreground/40">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
