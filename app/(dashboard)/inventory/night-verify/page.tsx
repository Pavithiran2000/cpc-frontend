'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

import { inventoryApi } from '@/lib/api/inventory'
import type { StockBalance } from '@/lib/types'
import { formatLitres, formatDate, cn } from '@/lib/utils'

// ─── Query keys ───────────────────────────────────────────────────────────────

const BALANCES_KEY = ['stock-balances', { limit: 100 }]

// ─── Verification result ──────────────────────────────────────────────────────

interface VerificationResult {
  product_name: string
  product_id: string
  system_qty: number
  counted_qty: number
  variance: number
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NightVerifyPage() {
  const queryClient = useQueryClient()

  const today = new Date().toISOString().slice(0, 10)
  const [businessDate, setBusinessDate] = useState(today)
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [results, setResults] = useState<VerificationResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const balancesQuery = useQuery({
    queryKey: BALANCES_KEY,
    queryFn:  () => inventoryApi.listBalances({ limit: 100 }).then((r) => r.data.data),
    staleTime: 60_000,
  })

  const balances: StockBalance[] = balancesQuery.data ?? []

  const mutation = useMutation({
    mutationFn: (verifications: Array<{ product_id: string; counted_quantity: number }>) =>
      inventoryApi.nightVerify({ business_date: businessDate, verifications }),
    onSuccess: (res) => {
      // Build result comparison
      const data = (res.data as unknown as Array<{ product_id: string; counted_quantity: number; variance?: number }>) ?? []
      const mapped: VerificationResult[] = balances
        .filter((b) => counts[b.product_id] !== undefined && counts[b.product_id] !== '')
        .map((b) => {
          const counted = parseFloat(counts[b.product_id] ?? '0')
          return {
            product_name: b.product?.product_name ?? b.product_id,
            product_id:   b.product_id,
            system_qty:   b.quantity_on_hand,
            counted_qty:  counted,
            variance:     counted - b.quantity_on_hand,
          }
        })
      setResults(mapped)
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Verification failed. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResults(null)

    const verifications = balances
      .filter((b) => counts[b.product_id] !== undefined && counts[b.product_id] !== '')
      .map((b) => ({
        product_id:       b.product_id,
        counted_quantity: parseFloat(counts[b.product_id]),
      }))

    if (verifications.length === 0) {
      setError('Enter at least one counted quantity.')
      return
    }

    mutation.mutate(verifications)
  }

  const allFilled = useMemo(
    () => balances.length > 0 && balances.every((b) => counts[b.product_id] !== undefined && counts[b.product_id] !== ''),
    [balances, counts],
  )

  if (balancesQuery.isLoading) {
    return (
      <div className="p-5">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-muted/50" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="mb-2">
        <h1 className="font-syne text-2xl font-bold text-foreground">Night Verification</h1>
        <p className="mt-1 text-sm text-foreground/50">
          Enter physical stock counts at end of shift to detect variances
        </p>
      </div>

      {/* Result panel */}
      {results && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-syne text-sm font-semibold text-foreground">
            Verification Results — {formatDate(businessDate)}
          </h2>
          <div className="space-y-2">
            {results.map((r) => {
              const hasVariance = Math.abs(r.variance) > 0.001
              return (
                <div
                  key={r.product_id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3.5 py-2.5',
                    hasVariance
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-emerald-500/20 bg-emerald-500/5',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {hasVariance ? (
                      <AlertTriangle size={14} className="text-amber-400" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    <span className="text-sm font-medium text-foreground">{r.product_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-foreground/35">System</p>
                      <p className="number text-xs text-foreground/70">{formatLitres(r.system_qty)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-foreground/35">Counted</p>
                      <p className="number text-xs text-foreground/70">{formatLitres(r.counted_qty)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-foreground/35">Variance</p>
                      <p
                        className={cn(
                          'number text-xs font-semibold',
                          hasVariance ? 'text-amber-400' : 'text-emerald-400',
                        )}
                      >
                        {r.variance >= 0 ? '+' : ''}{formatLitres(r.variance)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => { setResults(null); setCounts({}) }}
            className="mt-3 text-xs text-foreground/35 hover:text-foreground/60"
          >
            Start new verification
          </button>
        </div>
      )}

      {!results && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Date picker */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
              Business Date
            </label>
            <input
              type="date"
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
              max={today}
              className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground outline-none focus:border-[#E85D04]/60"
            />
          </div>

          {/* Product count entries */}
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border/60 bg-card px-4 py-2.5">
              <h2 className="font-syne text-sm font-semibold text-foreground/80">
                Physical Stock Count
              </h2>
            </div>
            {balances.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-foreground/40">
                No stock balances found. Ensure products and tanks are configured.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {balances.map((b) => (
                  <div
                    key={b.product_id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {b.product?.product_name ?? b.product_id}
                      </p>
                      <p className="text-xs text-foreground/40">
                        System: {formatLitres(b.quantity_on_hand)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-foreground/35">
                        Counted Qty
                      </p>
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={counts[b.product_id] ?? ''}
                      onChange={(e) =>
                        setCounts((prev) => ({ ...prev, [b.product_id]: e.target.value }))
                      }
                      placeholder="0.000"
                      className="number w-36 rounded-lg border border-border bg-muted/50 px-3 py-2 text-right text-sm text-foreground outline-none focus:border-[#E85D04]/60"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || balances.length === 0}
            className="flex h-10 items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white transition-colors hover:bg-[#F48C06] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Verification'}
          </button>
        </form>
      )}
    </div>
  )
}
