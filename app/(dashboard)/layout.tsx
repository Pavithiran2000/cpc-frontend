'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0B]">
      {/* Desktop sidebar — fixed, always visible ≥ md */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar — slide-in Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 border-r border-white/6 bg-[#0A0A0B] p-0"
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
