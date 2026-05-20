import { cn } from '@/lib/utils'

interface Props {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }

export function LoadingSpinner({ className, size = 'md' }: Props) {
  return (
    <div
      role="status"
      className={cn(
        'animate-spin rounded-full border-2 border-[#E85D04]/30 border-t-[#E85D04]',
        sizes[size],
        className,
      )}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0A0A0B]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
