import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/providers/ThemeProvider'

export default function PlatformAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="mb-6 text-center">
          <p className="font-syne text-2xl font-bold text-foreground">CPC Platform Admin</p>
          <p className="mt-1 text-sm text-foreground/50">Secure administration portal</p>
        </div>
        <div className="w-full max-w-[400px] rounded-xl border border-border bg-card p-8 shadow-sm">
          {children}
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  )
}
