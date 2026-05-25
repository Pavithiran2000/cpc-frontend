'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, CheckCircle2, ChevronRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { bowserApi } from '@/lib/api/bowser'
import { inventoryApi } from '@/lib/api/inventory'
import type { BowserReceipt, FuelTank, Product } from '@/lib/types'
import { formatDate, formatLitres, formatCurrency, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// ─── Query keys ───────────────────────────────────────────────────────────────

const RECEIPTS_KEY = (f: object) => ['bowser-receipts', f]
const TANKS_KEY    = ['tanks', { limit: 100 }]
const PRODUCTS_KEY = ['products', { limit: 100, status: 'ACTIVE' }]

// ─── Create schema ────────────────────────────────────────────────────────────

const createSchema = z.object({
  receipt_no:    z.string().min(1, 'Receipt number is required'),
  supplier_name: z.string().optional(),
  vehicle_no:    z.string().optional(),
  driver_name:   z.string().optional(),
  received_date: z.string().min(1, 'Date is required'),
  lines: z.array(z.object({
    tank_id:         z.string().min(1, 'Tank required'),
    product_id:      z.string().min(1, 'Product required'),
    received_litres: z.number().positive('Must be > 0'),
    unit_cost:       z.number().positive('Must be > 0'),
  })).min(1, 'At least one delivery line required'),
})

type CreateFormValues = z.infer<typeof createSchema>

// ─── Approve schema ───────────────────────────────────────────────────────────

const approveSchema = z.object({
  lines: z.array(z.object({
    tank_id:         z.string().min(1, 'Tank required'),
    product_id:      z.string().min(1, 'Product required'),
    received_litres: z.number().positive('Must be > 0'),
    unit_cost:       z.number().positive('Must be > 0'),
  })).min(1, 'At least one line required'),
})

type ApproveFormValues = z.infer<typeof approveSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm text-foreground',
    'placeholder:text-muted-foreground outline-none transition-colors',
    hasError
      ? 'border-rose-500/50 focus:border-rose-500/70 focus:ring-2 focus:ring-rose-500/15'
      : 'border-border focus:border-[#E85D04]/60 focus:ring-2 focus:ring-[#E85D04]/15',
  ].join(' ')
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

// ─── Create receipt form ──────────────────────────────────────────────────────

function CreateReceiptForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()

  const tanksQuery = useQuery({
    queryKey: TANKS_KEY,
    queryFn:  () => inventoryApi.listTanks({ limit: 100 }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })
  const productsQuery = useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn:  () => inventoryApi.listProducts({ limit: 100, status: 'ACTIVE' }).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })
  const tanks        = tanksQuery.data    ?? []
  const fuelProducts = (productsQuery.data ?? []).filter((p) => p.category === 'FUEL')

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<CreateFormValues>({
      resolver: zodResolver(createSchema),
      defaultValues: {
        received_date: new Date().toISOString().slice(0, 10),
        lines: [{ tank_id: '', product_id: '', received_litres: 0, unit_cost: 0 }],
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await bowserApi.create(data)
      await queryClient.invalidateQueries({ queryKey: ['bowser-receipts'] })
      toast.success('Receipt created')
      onSuccess()
    } catch {
      toast.error('Failed to create receipt')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Receipt No." error={errors.receipt_no?.message}>
        <input {...register('receipt_no')} type="text" placeholder="BW-2025-001"
          className={inputCls(!!errors.receipt_no)} />
      </Field>
      <Field label="Received Date" error={errors.received_date?.message}>
        <input {...register('received_date')} type="date"
          className={inputCls(!!errors.received_date) + ' number'} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Supplier" error={errors.supplier_name?.message}>
          <input {...register('supplier_name')} type="text" placeholder="Ceylon Petroleum"
            className={inputCls(!!errors.supplier_name)} />
        </Field>
        <Field label="Vehicle No." error={errors.vehicle_no?.message}>
          <input {...register('vehicle_no')} type="text" placeholder="WP ABC-1234"
            className={inputCls(!!errors.vehicle_no)} />
        </Field>
      </div>
      <Field label="Driver Name" error={errors.driver_name?.message}>
        <input {...register('driver_name')} type="text" placeholder="Driver name"
          className={inputCls(!!errors.driver_name)} />
      </Field>

      {/* Delivery lines */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
            Delivery Lines
          </p>
          <button type="button"
            onClick={() => append({ tank_id: '', product_id: '', received_litres: 0, unit_cost: 0 })}
            className="flex items-center gap-1 text-xs text-[#E85D04]/70 hover:text-[#E85D04]">
            <Plus size={11} /> Add line
          </button>
        </div>
        {(errors.lines as { message?: string } | undefined)?.message && (
          <p className="mb-2 text-xs text-rose-400">{(errors.lines as { message?: string }).message}</p>
        )}
        <div className="flex flex-col gap-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="relative rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-foreground/30">Line {idx + 1}</span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(idx)}
                    className="text-foreground/25 hover:text-rose-400">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tank" error={(errors.lines?.[idx] as { tank_id?: { message?: string } })?.tank_id?.message}>
                  <select {...register(`lines.${idx}.tank_id`)}
                    className={inputCls(!!(errors.lines?.[idx] as { tank_id?: unknown })?.tank_id) + ' cursor-pointer'}>
                    <option value="" className="bg-card">Select tank…</option>
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id} className="bg-card">
                        {t.tank_code} ({t.capacity_litres.toLocaleString('en-LK', { maximumFractionDigits: 0 })} L)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Product" error={(errors.lines?.[idx] as { product_id?: { message?: string } })?.product_id?.message}>
                  <select {...register(`lines.${idx}.product_id`)}
                    className={inputCls(!!(errors.lines?.[idx] as { product_id?: unknown })?.product_id) + ' cursor-pointer'}>
                    <option value="" className="bg-card">Select product…</option>
                    {fuelProducts.map((p) => (
                      <option key={p.id} value={p.id} className="bg-card">{p.product_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Litres" error={(errors.lines?.[idx] as { received_litres?: { message?: string } })?.received_litres?.message}>
                  <input {...register(`lines.${idx}.received_litres`, { setValueAs: (v) => v === '' ? 0 : parseFloat(v) })}
                    type="number" step="0.001" min="0" placeholder="0.000"
                    className={inputCls(!!(errors.lines?.[idx] as { received_litres?: unknown })?.received_litres) + ' number'} />
                </Field>
                <Field label="Unit Cost (LKR/L)" error={(errors.lines?.[idx] as { unit_cost?: { message?: string } })?.unit_cost?.message}>
                  <input {...register(`lines.${idx}.unit_cost`, { setValueAs: (v) => v === '' ? 0 : parseFloat(v) })}
                    type="number" step="0.01" min="0" placeholder="0.00"
                    className={inputCls(!!(errors.lines?.[idx] as { unit_cost?: unknown })?.unit_cost) + ' number'} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60">
        {isSubmitting ? 'Creating…' : 'Create Receipt'}
      </button>
    </form>
  )
}

// ─── Approve form ─────────────────────────────────────────────────────────────

function ApproveReceiptForm({
  receipt,
  tanks,
  products,
  onSuccess,
}: {
  receipt: BowserReceipt
  tanks: FuelTank[]
  products: Product[]
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ApproveFormValues>({
      resolver: zodResolver(approveSchema),
      defaultValues: { lines: [{ tank_id: '', product_id: '', received_litres: 0, unit_cost: 0 }] },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const fuelTanks = tanks
  const fuelProducts = products.filter((p) => p.category === 'FUEL')

  const onSubmit = handleSubmit(async (data) => {
    try {
      await bowserApi.approve(receipt.id, data.lines)
      await queryClient.invalidateQueries({ queryKey: ['bowser-receipts'] })
      await queryClient.invalidateQueries({ queryKey: ['stock-balances'] })
      toast.success('Receipt approved — stock updated')
      onSuccess()
    } catch {
      toast.error('Failed to approve receipt')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3.5 py-3">
        <p className="text-xs font-medium text-foreground/60">Receipt: <span className="number text-foreground">{receipt.receipt_no}</span></p>
        {receipt.supplier_name && <p className="text-xs text-foreground/40">{receipt.supplier_name}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {fields.map((field, idx) => (
          <div key={field.id} className="relative rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-foreground/30">Line {idx + 1}</span>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(idx)}
                  className="text-foreground/25 hover:text-rose-400">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tank" error={(errors.lines?.[idx] as { tank_id?: { message?: string } })?.tank_id?.message}>
                <select {...register(`lines.${idx}.tank_id`)}
                  className={inputCls(!!(errors.lines?.[idx] as { tank_id?: unknown })?.tank_id) + ' cursor-pointer'}>
                  <option value="" className="bg-card">Select tank…</option>
                  {fuelTanks.map((t) => (
                    <option key={t.id} value={t.id} className="bg-card">
                      {t.tank_code} ({t.capacity_litres.toLocaleString('en-LK', { maximumFractionDigits: 0 })} L)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Product" error={(errors.lines?.[idx] as { product_id?: { message?: string } })?.product_id?.message}>
                <select {...register(`lines.${idx}.product_id`)}
                  className={inputCls(!!(errors.lines?.[idx] as { product_id?: unknown })?.product_id) + ' cursor-pointer'}>
                  <option value="" className="bg-card">Select product…</option>
                  {fuelProducts.map((p) => (
                    <option key={p.id} value={p.id} className="bg-card">{p.product_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Received Litres" error={(errors.lines?.[idx] as { received_litres?: { message?: string } })?.received_litres?.message}>
                <input {...register(`lines.${idx}.received_litres`, { setValueAs: (v) => v === '' ? 0 : parseFloat(v) })} type="number" step="0.001" min="0"
                  placeholder="0.000"
                  className={inputCls(!!(errors.lines?.[idx] as { received_litres?: unknown })?.received_litres) + ' number'} />
              </Field>
              <Field label="Unit Cost (LKR/L)" error={(errors.lines?.[idx] as { unit_cost?: { message?: string } })?.unit_cost?.message}>
                <input {...register(`lines.${idx}.unit_cost`, { setValueAs: (v) => v === '' ? 0 : parseFloat(v) })} type="number" step="0.01" min="0"
                  placeholder="0.00"
                  className={inputCls(!!(errors.lines?.[idx] as { unit_cost?: unknown })?.unit_cost) + ' number'} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <button type="button"
        onClick={() => append({ tank_id: '', product_id: '', received_litres: 0, unit_cost: 0 })}
        className="flex items-center gap-1.5 text-xs text-foreground/35 hover:text-foreground/60">
        <Plus size={12} /> Add line
      </button>

      <button type="submit" disabled={isSubmitting}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
        <CheckCircle2 size={14} />
        {isSubmitting ? 'Approving…' : 'Approve Receipt'}
      </button>
    </form>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function ReceiptDetailDrawer({
  receipt,
  onOpenChange,
}: {
  receipt: BowserReceipt | null
  onOpenChange: (v: boolean) => void
}) {
  const tanksQuery = useQuery({
    queryKey: TANKS_KEY,
    queryFn:  () => inventoryApi.listTanks({ limit: 100 }).then((r) => r.data.data),
    enabled:  !!receipt,
    staleTime: 5 * 60 * 1000,
  })

  const productsQuery = useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn:  () => inventoryApi.listProducts({ limit: 100, status: 'ACTIVE' }).then((r) => r.data.data),
    enabled:  !!receipt,
    staleTime: 5 * 60 * 1000,
  })

  const detailQuery = useQuery({
    queryKey: ['bowser-receipt', receipt?.id],
    queryFn:  () => bowserApi.getById(receipt!.id).then((r) => r.data),
    enabled:  !!receipt,
  })

  const fullReceipt = detailQuery.data ?? receipt
  const tanks    = tanksQuery.data    ?? []
  const products = productsQuery.data ?? []
  const isDraft  = fullReceipt?.status === 'DRAFT'

  return (
    <Sheet open={!!receipt} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-border bg-card p-0 sm:max-w-[500px]"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-syne text-base font-semibold text-foreground">
              Bowser Receipt
            </SheetTitle>
            {fullReceipt && <StatusBadge status={fullReceipt.status} />}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {fullReceipt && (
            <>
              {/* Summary */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/35">Receipt No.</p>
                  <p className="number text-sm font-medium text-foreground">{fullReceipt.receipt_no}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/35">Date</p>
                  <p className="number text-sm text-foreground/70">{formatDate(fullReceipt.received_date)}</p>
                </div>
                {fullReceipt.supplier_name && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/35">Supplier</p>
                    <p className="text-sm text-foreground/70">{fullReceipt.supplier_name}</p>
                  </div>
                )}
                {fullReceipt.vehicle_no && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/35">Vehicle</p>
                    <p className="number text-sm text-foreground/70">{fullReceipt.vehicle_no}</p>
                  </div>
                )}
              </div>

              {/* Existing lines (approved) */}
              {fullReceipt.lines && fullReceipt.lines.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-foreground/35">Delivery Lines</p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {fullReceipt.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between px-3.5 py-2.5">
                        <div>
                          <p className="text-sm text-foreground">{line.product?.product_name ?? line.product_id}</p>
                          <p className="number text-xs text-foreground/40">{formatLitres(line.received_litres)}</p>
                        </div>
                        <p className="number text-xs text-foreground/60">{formatCurrency(line.unit_cost)}/L</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approve form for DRAFT receipts */}
              {isDraft && (
                <ApproveReceiptForm
                  receipt={fullReceipt}
                  tanks={tanks}
                  products={products}
                  onSuccess={() => onOpenChange(false)}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: '',         label: 'All'      },
  { key: 'DRAFT',    label: 'Draft'    },
  { key: 'APPROVED', label: 'Approved' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BowserReceiptsPage() {
  const { page, limit, sortBy, sortOrder, setPage, setLimit, setSort, resetPage } = usePagination()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [createOpen,   setCreateOpen]   = useState(false)
  const [detailTarget, setDetailTarget] = useState<BowserReceipt | null>(null)

  const filters = useMemo(
    () => ({ page, limit, search, status: statusFilter || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, sort_by: sortBy, sort_order: sortOrder }),
    [page, limit, search, statusFilter, dateFrom, dateTo, sortBy, sortOrder],
  )

  const query = useQuery({
    queryKey: RECEIPTS_KEY(filters),
    queryFn:  () => bowserApi.list(filters).then((r) => r.data),
  })

  const handleSearch = useCallback(
    (q: string) => { setSearch(q); resetPage() },
    [resetPage],
  )

  const columns = useMemo<ColumnDef<BowserReceipt>[]>(
    () => [
      {
        id: 'receipt_no',
        header: 'Receipt No.',
        meta: { sortKey: 'receipt_no', defaultSortDir: 'ASC' as const },
        cell: ({ row }) => (
          <span className="number text-sm font-medium text-foreground">{row.original.receipt_no}</span>
        ),
      },
      {
        id: 'received_date',
        header: 'Date',
        meta: { sortKey: 'received_date', defaultSortDir: 'DESC' as const },
        cell: ({ row }) => (
          <span className="number text-xs text-foreground/60">{formatDate(row.original.received_date)}</span>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        meta: { sortKey: 'supplier_name', defaultSortDir: 'ASC' as const },
        cell: ({ row }) => (
          <span className="text-sm text-foreground/70">{row.original.supplier_name ?? '—'}</span>
        ),
      },
      {
        id: 'vehicle_no',
        header: 'Vehicle',
        cell: ({ row }) => (
          <span className="number text-xs text-foreground/50">{row.original.vehicle_no ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { sortKey: 'status', defaultSortDir: 'ASC' as const },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); setDetailTarget(row.original) }}
              className="rounded p-1.5 text-foreground/30 transition-colors hover:bg-muted/50 hover:text-foreground/70"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Bowser Receipts"
        description="Manage fuel delivery receipts from suppliers"
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#F48C06]"
          >
            <Plus size={14} />
            New Receipt
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setStatusFilter(t.key); resetPage() }}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === t.key
                  ? 'bg-[#E85D04]/15 text-[#E85D04]'
                  : 'text-foreground/40 hover:text-foreground/70',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            className="number rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/60 outline-none focus:border-[#E85D04]/50" />
          <span className="text-foreground/30">—</span>
          <input type="date" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            className="number rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/60 outline-none focus:border-[#E85D04]/50" />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        total={query.data?.meta.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={query.isLoading}
        searchable
        onSearch={handleSearch}
        emptyMessage="No bowser receipts found"
        onRowClick={(row) => setDetailTarget(row)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSort}
      />

      {/* Create drawer */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-border bg-card p-0 sm:max-w-[520px]"
        >
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-foreground">
              New Bowser Receipt
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <CreateReceiptForm onSuccess={() => setCreateOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail / approve drawer */}
      <ReceiptDetailDrawer
        receipt={detailTarget}
        onOpenChange={(v) => !v && setDetailTarget(null)}
      />
    </div>
  )
}
