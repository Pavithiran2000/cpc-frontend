'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import { inventoryApi } from '@/lib/api/inventory'
import type { Product, ProductPrice } from '@/lib/types'
import { formatDate, formatCurrency, cn } from '@/lib/utils'

import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

// ─── Category tabs ────────────────────────────────────────────────────────────

const CATEGORIES = ['FUEL', 'GAS', 'LUBRICANT'] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_COLORS: Record<Category, string> = {
  FUEL:      'bg-amber-500/15 text-amber-400',
  GAS:       'bg-blue-500/15 text-blue-400',
  LUBRICANT: 'bg-emerald-500/15 text-emerald-400',
}

const UNIT_LABELS: Record<string, string> = {
  LITRE: 'L',
  UNIT:  'unit',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white',
    'placeholder:text-white/25 outline-none',
    hasError ? 'border-rose-500/50' : 'border-white/10 focus:border-[#E85D04]/60',
  ].join(' ')
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

// ─── Add Product Modal ────────────────────────────────────────────────────────

const productSchema = z.object({
  product_code:        z.string().min(1, 'Required'),
  product_name:        z.string().min(1, 'Required'),
  category:            z.enum(['FUEL', 'GAS', 'LUBRICANT']),
  measurement_unit_id: z.string().uuid('Required'),
})
type ProductFormValues = z.infer<typeof productSchema>

function AddProductModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category: 'FUEL' as const,
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await inventoryApi.createProduct(data)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product added')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to add product')
    }
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#18181C] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-syne text-base font-semibold text-white">Add Product</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Code" error={errors.product_code?.message}>
              <input
                {...register('product_code')}
                placeholder="PRD-001"
                className={inputCls(!!errors.product_code) + ' number uppercase'}
              />
            </Field>
            <Field label="Name" error={errors.product_name?.message}>
              <input
                {...register('product_name')}
                placeholder="Petrol 92"
                className={inputCls(!!errors.product_name)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" error={errors.category?.message}>
              <select
                {...register('category')}
                className={inputCls(!!errors.category) + ' cursor-pointer'}
              >
                <option value="FUEL"      className="bg-[#18181C]">Fuel</option>
                <option value="GAS"       className="bg-[#18181C]">Gas</option>
                <option value="LUBRICANT" className="bg-[#18181C]">Lubricant</option>
              </select>
            </Field>
            <Field label="Unit" error={errors.measurement_unit_id?.message}>
              <select
                {...register('measurement_unit_id')}
                className={inputCls(!!errors.measurement_unit_id) + ' cursor-pointer'}
              >
                <option value="ff8993f8-cbb7-4641-8fa9-a56eaeae9813" className="bg-[#18181C]">Litre</option>
                <option value="99a14f56-59e1-4efd-ad9a-0681b14f4c88" className="bg-[#18181C]">Unit</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#E85D04] py-2 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
            >
              {isSubmitting ? 'Adding…' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Update Price Modal ────────────────────────────────────────────────────────

const priceSchema = z.object({
  selling_price:  z.number().positive('Must be > 0'),
  cost_price:     z.number().min(0).optional(),
  effective_from: z.string().min(1, 'Required'),
})
type PriceFormValues = z.infer<typeof priceSchema>

function UpdatePriceModal({
  product,
  open,
  onOpenChange,
}: {
  product: Product
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      effective_from: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await inventoryApi.createPrice(product.id, {
        selling_price:  data.selling_price,
        cost_price:     data.cost_price,
        effective_from: new Date(data.effective_from).toISOString(),
      })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      await queryClient.invalidateQueries({ queryKey: ['product-prices', product.id] })
      toast.success('Price updated')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to update price')
    }
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-white/10 bg-[#18181C] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 font-syne text-base font-semibold text-white">
          Update Price
        </h3>
        <p className="mb-4 text-xs text-white/40">{product.product_name}</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="New Selling Price (LKR)" error={errors.selling_price?.message}>
            <input
              {...register('selling_price', {
                setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
              })}
              type="number"
              step="0.01"
              placeholder="0.00"
              className={inputCls(!!errors.selling_price) + ' number'}
            />
          </Field>
          <Field label="Cost Price (LKR, optional)" error={errors.cost_price?.message}>
            <input
              {...register('cost_price', {
                setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
              })}
              type="number"
              step="0.01"
              placeholder="0.00"
              className={inputCls(false) + ' number'}
            />
          </Field>
          <Field label="Effective From" error={errors.effective_from?.message}>
            <input
              {...register('effective_from')}
              type="date"
              className={inputCls(!!errors.effective_from) + ' number'}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#E85D04] py-2 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Set Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Price History Accordion ──────────────────────────────────────────────────

function PriceHistoryAccordion({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false)

  const pricesQuery = useQuery({
    queryKey: ['product-prices', product.id],
    queryFn: () => inventoryApi.listPrices(product.id, { limit: 20 }).then((r) => r.data),
    enabled: expanded,
  })
  const prices: ProductPrice[] = pricesQuery.data?.data ?? []

  return (
    <div className="mt-3 rounded-lg border border-white/8 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-white/40 hover:bg-white/[0.03] transition-colors"
      >
        <span className="font-semibold uppercase tracking-widest text-[10px]">
          Price History
        </span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div className="border-t border-white/8">
          {pricesQuery.isLoading ? (
            <p className="px-3 py-3 text-xs text-white/25">Loading…</p>
          ) : prices.length === 0 ? (
            <p className="px-3 py-3 text-xs text-white/25">No price history</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-white/25">
                    Effective From
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-white/25">
                    Price
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-white/25">
                    Until
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {prices.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="number px-3 py-2 text-white/50">
                      {formatDate(p.effective_from)}
                    </td>
                    <td className="number px-3 py-2 text-right font-medium text-white/70">
                      {formatCurrency(p.selling_price)}
                    </td>
                    <td className="number px-3 py-2 text-right text-white/30">
                      {p.effective_to ? formatDate(p.effective_to) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const unit = product.category === 'FUEL' ? 'L' : 'unit'

  return (
    <div className="flex flex-col rounded-xl border border-white/8 bg-[#18181C] p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                CATEGORY_COLORS[product.category as Category] ?? 'bg-white/10 text-white/50'
              }`}
            >
              {product.category}
            </span>
            <span className="number text-[10px] text-white/30">{product.product_code}</span>
          </div>
          <p className="font-syne text-lg font-semibold text-white leading-tight truncate">
            {product.product_name}
          </p>
          <p className="text-[11px] text-white/35 mt-0.5">per {unit}</p>
        </div>
        <StatusBadge status={product.status} />
      </div>

      {/* Current price */}
      <div className="mb-3">
        {product.current_price != null ? (
          <p className="number text-2xl font-bold text-[#E85D04]">
            LKR {product.current_price.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            <span className="text-sm font-normal text-white/30 ml-1">/ {unit}</span>
          </p>
        ) : (
          <p className="text-sm text-white/25">No price set</p>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={() => setPriceModalOpen(true)}
        className="flex h-8 w-full items-center justify-center rounded-lg border border-[#E85D04]/30 text-xs font-semibold text-[#E85D04]/80 hover:bg-[#E85D04]/10 hover:border-[#E85D04]/60 transition-colors"
      >
        Update Price
      </button>

      {/* Price History Accordion */}
      <PriceHistoryAccordion product={product} />

      <UpdatePriceModal
        product={product}
        open={priceModalOpen}
        onOpenChange={setPriceModalOpen}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [category, setCategory] = useState<Category>('FUEL')
  const [addOpen, setAddOpen] = useState(false)

  const query = useQuery({
    queryKey: ['products', { category, limit: 100 }],
    queryFn: () =>
      inventoryApi
        .listProducts({ limit: 100, status: 'ACTIVE' } as Parameters<typeof inventoryApi.listProducts>[0])
        .then((r) => r.data),
  })

  const filtered = useMemo(
    () => (query.data?.data ?? []).filter((p) => p.category === category),
    [query.data, category],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Products"
        description="Fuel, gas, and lubricant product catalogue"
        actions={
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
          >
            <Plus size={14} /> Add Product
          </button>
        }
      />

      {/* Category tabs */}
      <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1 w-fit">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              category === c
                ? 'bg-[#E85D04] text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Product cards */}
      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-12">
          No {category.toLowerCase()} products configured.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <AddProductModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
