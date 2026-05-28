import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string  // alias for subtitle (used in page stubs)
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, description, actions, className }: PageHeaderProps) {
  const sub = subtitle ?? description
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="font-syne text-2xl font-bold text-foreground">{title}</h1>
        {sub && (
          <p className="mt-1 text-sm text-foreground/50">{sub}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
