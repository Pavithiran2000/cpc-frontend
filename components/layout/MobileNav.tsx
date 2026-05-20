'use client'

import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:text-white/80 md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 border-white/5 bg-[#111114]">
        <Sidebar />
      </SheetContent>
    </Sheet>
  )
}
