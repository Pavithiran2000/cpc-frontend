'use client'

import { useTheme } from '@/providers/ThemeProvider'
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  const { resolvedTheme } = useTheme()

  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolvedTheme}
      toastOptions={{
        classNames: {
          toast:
            'border border-border bg-card text-foreground text-sm shadow-xl',
          title: 'text-foreground font-medium',
          description: 'text-foreground/60 text-xs',
          success: 'border-emerald-500/30',
          error: 'border-rose-500/30',
        },
      }}
    />
  )
}
