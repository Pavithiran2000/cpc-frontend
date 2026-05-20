'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        classNames: {
          toast:
            'border border-white/10 bg-[#18181C] text-white text-sm shadow-xl',
          title: 'text-white font-medium',
          description: 'text-white/60 text-xs',
          success: 'border-emerald-500/30',
          error: 'border-rose-500/30',
        },
      }}
    />
  )
}
