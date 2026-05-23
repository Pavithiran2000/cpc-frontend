'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Droplet, FlaskConical, Layers } from 'lucide-react'
import Link from 'next/link'

import { inventoryApi } from '@/lib/api/inventory'
import type { StockBalance, FuelTank } from '@/lib/types'
import { formatLitres, cn } from '@/lib/utils'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

// ─── Query keys ───────────────────────────────────────────────────────────────

const BALANCES_KEY = ['stock-balances', { limit: 100 }]
const TANKS_KEY    = ['tanks', { limit: 100 }]

// ─── Category icon ────────────────────────────────────────────────────────────

function categoryIcon(name: string) {
  const n = name?.toLowerCase() ?? ''
  if (n.includes('diesel') || n.includes('petrol') || n.includes('fuel'))
    return Droplet
  if (n.includes('gas') || n.includes('lpg'))
    return FlaskConical
  return Package
}

// ─── Stock level bar ──────────────────────────────────────────────────────────

function StockBar({ pct }: { pct: number }) {
  const color =
    pct > 30 ? 'bg-emerald-500' : pct > 10 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

// ─── Stock card ───────────────────────────────────────────────────────────────

function StockCard({
  balance,
  capacity,
}: {
  balance: StockBalance
  capacity: number | null
}) {
  const product  = balance.product
  const name     = product?.product_name ?? balance.product_id
  const category = product?.category ?? 'UNKNOWN'
  const qty      = balance.quantity_on_hand != null ? Number(balance.quantity_on_hand) : 0

  const pct = capacity && capacity > 0 ? (qty / capacity) * 100 : null

  const Icon = categoryIcon(name)

  const catColor =
    category === 'FUEL'      ? 'text-[#E85D04]' :
    category === 'GAS'       ? 'text-sky-400'   :
    category === 'LUBRICANT' ? 'text-amber-400'  :
    'text-white/40'

  const catBg =
    category === 'FUEL'      ? 'bg-[#E85D04]/10 border-[#E85D04]/15' :
    category === 'GAS'       ? 'bg-sky-500/10 border-sky-500/15'      :
    category === 'LUBRICANT' ? 'bg-amber-500/10 border-amber-500/15'  :
    'bg-white/5 border-white/5'

  return (
    <div className={cn('rounded-lg border p-4', catBg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className={catColor} />
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/35">
              {category}
            </p>
          </div>
        </div>
        {product?.measurement_unit && (
          <span className="text-[10px] uppercase tracking-wider text-white/30">
            {product.measurement_unit === 'LITRE' ? 'L' : 'UNIT'}
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="number text-2xl font-bold text-white">
            {product?.measurement_unit === 'LITRE'
              ? qty.toLocaleString('en-LK', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
              : qty.toLocaleString('en-LK')}
          </span>
          {capacity != null && (
            <span className="number text-xs text-white/35">
              / {capacity.toLocaleString('en-LK', { maximumFractionDigits: 0 })} L
            </span>
          )}
        </div>

        {pct != null && <StockBar pct={pct} />}

        {pct != null && (
          <p
            className={cn(
              'mt-1 text-[10px] uppercase tracking-wider',
              pct > 30 ? 'text-emerald-400' : pct > 10 ? 'text-amber-400' : 'text-rose-400',
            )}
          >
            {pct.toFixed(1)}% of capacity
          </p>
        )}
      </div>

      <p className="mt-2 text-[10px] text-white/20">
        Updated {new Date(balance.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-white/5 bg-[#18181C] p-4">
      <div className="flex items-start gap-2">
        <div className="h-4 w-4 rounded bg-white/10" />
        <div>
          <div className="h-3 w-28 rounded bg-white/10" />
          <div className="mt-1.5 h-2.5 w-16 rounded bg-white/8" />
        </div>
      </div>
      <div className="mt-4 h-7 w-36 rounded bg-white/10" />
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/5" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const balancesQuery = useQuery({
    queryKey: BALANCES_KEY,
    queryFn:  () => inventoryApi.listBalances({ limit: 100 }).then((r) => r.data.data),
    refetchInterval: 2 * 60 * 1000,
  })

  const tanksQuery = useQuery({
    queryKey: TANKS_KEY,
    queryFn:  () => inventoryApi.listTanks({ limit: 100 }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  // Build capacity map: product_id → total tank capacity
  const capacityMap = useMemo<Record<string, number>>(() => {
    const tanks = tanksQuery.data ?? []
    const map: Record<string, number> = {}
    for (const tank of tanks) {
      map[tank.fuel_product_id] = (map[tank.fuel_product_id] ?? 0) + tank.capacity_litres
    }
    return map
  }, [tanksQuery.data])

  const balances = balancesQuery.data ?? []

  // Group by category for display
  const byCategory = useMemo(() => {
    const groups: Record<string, StockBalance[]> = { FUEL: [], GAS: [], LUBRICANT: [], OTHER: [] }
    for (const b of balances) {
      const cat = b.product?.category ?? 'OTHER'
      ;(groups[cat] ?? (groups[cat] = [])).push(b)
    }
    return groups
  }, [balances])

  const categories = (['FUEL', 'GAS', 'LUBRICANT', 'OTHER'] as const).filter(
    (c) => byCategory[c]?.length > 0,
  )

  const isLoading = balancesQuery.isLoading

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Stock Inventory"
        description="Current stock balances across all products"
        actions={
          <div className="flex gap-2">
            <Link
              href="/inventory/movements"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/80"
            >
              View Movements
            </Link>
            <Link
              href="/inventory/night-verify"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/80"
            >
              <Layers size={13} />
              Night Verification
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : balances.length === 0 ? (
        <EmptyState
          icon={Package}
          message="No stock balances found. Add products and start recording shifts."
        />
      ) : (
        categories.map((cat) => (
          <div key={cat}>
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              {cat}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {byCategory[cat].map((b) => (
                <StockCard
                  key={b.id}
                  balance={b}
                  capacity={capacityMap[b.product_id] ?? null}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
