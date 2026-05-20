'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Check, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import { stockOrdersApi } from '@/lib/api/stockOrders'
import { inventoryApi } from '@/lib/api/inventory'
import type { StockOrder, Product } from '@/lib/types'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ─── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = ['ALL', 'DRAFT', 'APPROVED'] as const
type StatusTab = (typeof STATUS_TABS)[number]

// ─── Form helpers ─────────────────────────────────────────────────────────────

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

// ─── Create order form ────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  product_id:       z.string().min(1, 'Select a product'),
  ordered_quantity: z.number().positive('Must be > 0'),
  unit_cost:        z.number().positive('Must be > 0'),
})

const createOrderSchema = z.object({
  order_no:               z.string().min(1, 'Required'),
  supplier_name:          z.string().min(1, 'Required'),
  order_date:             z.string().min(1, 'Required'),
  expected_delivery_date: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item required'),
})

type CreateOrderForm = z.infer<typeof createOrderSchema>

function CreateOrderForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      order_date: new Date().toISOString().slice(0, 10),
      items: [{ product_id: '', ordered_quantity: 0, unit_cost: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const productsQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn:  () => inventoryApi.listProducts({ limit: 100 }).then((r) => r.data),
  })
  const products: Product[] = productsQuery.data?.data ?? []

  const onSubmit = handleSubmit(async (data) => {
    try {
      await stockOrdersApi.create({
        order_no:               data.order_no,
        supplier_name:          data.supplier_name,
        order_date:             data.order_date,
        expected_delivery_date: data.expected_delivery_date || undefined,
        items:                  data.items,
      } as Partial<StockOrder>)
      await queryClient.invalidateQueries({ queryKey: ['stock-orders'] })
      toast.success('Stock order created')
      onSuccess()
    } catch {
      toast.error('Failed to create stock order')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Order No." error={errors.order_no?.message}>
          <input
            {...register('order_no')}
            placeholder="ORD-001"
            className={inputCls(!!errors.order_no) + ' number'}
          />
        </Field>
        <Field label="Order Date" error={errors.order_date?.message}>
          <input
            {...register('order_date')}
            type="date"
            className={inputCls(!!errors.order_date) + ' number'}
          />
        </Field>
      </div>
      <Field label="Supplier Name" error={errors.supplier_name?.message}>
        <input
          {...register('supplier_name')}
          placeholder="Supplier Ltd."
          className={inputCls(!!errors.supplier_name)}
        />
      </Field>
      <Field label="Expected Delivery" error={errors.expected_delivery_date?.message}>
        <input
          {...register('expected_delivery_date')}
          type="date"
          className={inputCls(false) + ' number'}
        />
      </Field>

      {/* Items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Items
          </label>
          <button
            type="button"
            onClick={() => append({ product_id: '', ordered_quantity: 0, unit_cost: 0 })}
            className="flex items-center gap-1 text-xs text-[#E85D04] hover:text-[#F48C06]"
          >
            <Plus size={11} /> Add Item
          </button>
        </div>
        {errors.items?.root && (
          <p className="mb-2 text-xs text-rose-400">{errors.items.root.message}</p>
        )}
        <div className="flex flex-col gap-2">
          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="flex items-end gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-[10px] text-white/30">Product</label>
                <select
                  {...register(`items.${idx}.product_id`)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                >
                  <option value="" className="bg-[#18181C]">Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#18181C]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-24 flex-col gap-1">
                <label className="text-[10px] text-white/30">Qty</label>
                <input
                  {...register(`items.${idx}.ordered_quantity`, {
                    setValueAs: (v) => (v === '' ? 0 : parseFloat(v)),
                  })}
                  type="number"
                  min="0"
                  step="0.001"
                  className="number w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                />
              </div>
              <div className="flex w-24 flex-col gap-1">
                <label className="text-[10px] text-white/30">Unit Cost</label>
                <input
                  {...register(`items.${idx}.unit_cost`, {
                    setValueAs: (v) => (v === '' ? 0 : parseFloat(v)),
                  })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="number w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="mb-0.5 rounded p-1 text-white/20 hover:text-rose-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Creating…' : 'Create Order'}
      </button>
    </form>
  )
}

// ─── Add payment dialog ───────────────────────────────────────────────────────

const paymentSchema = z.object({
  payment_type: z.enum(['CASH', 'CHEQUE', 'TRANSFER']),
  amount:       z.number().positive('Must be > 0'),
  payment_date: z.string().min(1, 'Required'),
  reference_no: z.string().optional(),
})

type PaymentForm = z.infer<typeof paymentSchema>

function AddPaymentDialog({
  orderId,
  onClose,
}: {
  orderId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_type: 'CASH' as const,
      payment_date: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await stockOrdersApi.addPayment(orderId, data)
      await queryClient.invalidateQueries({ queryKey: ['stock-orders'] })
      toast.success('Payment recorded')
      reset()
      onClose()
    } catch {
      toast.error('Failed to record payment')
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#18181C] p-5">
        <h3 className="mb-4 font-syne text-base font-semibold text-white">Add Payment</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Field label="Payment Type" error={errors.payment_type?.message}>
            <select
              {...register('payment_type')}
              className={inputCls(!!errors.payment_type) + ' cursor-pointer'}
            >
              <option value="CASH"     className="bg-[#18181C]">Cash</option>
              <option value="CHEQUE"   className="bg-[#18181C]">Cheque</option>
              <option value="TRANSFER" className="bg-[#18181C]">Transfer</option>
            </select>
          </Field>
          <Field label="Amount (LKR)" error={errors.amount?.message}>
            <input
              {...register('amount', {
                setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
              })}
              type="number"
              step="0.01"
              className={inputCls(!!errors.amount) + ' number'}
            />
          </Field>
          <Field label="Payment Date" error={errors.payment_date?.message}>
            <input
              {...register('payment_date')}
              type="date"
              className={inputCls(!!errors.payment_date) + ' number'}
            />
          </Field>
          <Field label="Reference No." error={undefined}>
            <input
              {...register('reference_no')}
              placeholder="CHQ/TXN ref"
              className={inputCls(false)}
            />
          </Field>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Adding…' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockOrdersPage() {
  const queryClient = useQueryClient()
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [statusTab,     setStatusTab]     = useState<StatusTab>('ALL')
  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<StockOrder | null>(null)

  const filters = useMemo(
    () => ({
      page,
      limit,
      status: statusTab === 'ALL' ? undefined : statusTab,
    }),
    [page, limit, statusTab],
  )

  const query = useQuery({
    queryKey: ['stock-orders', filters],
    queryFn:  () => stockOrdersApi.list(filters).then((r) => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => stockOrdersApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-orders'] })
      setApproveTarget(null)
      toast.success('Stock order approved')
    },
    onError: () => toast.error('Failed to approve order'),
  })

  const columns = useMemo<ColumnDef<StockOrder>[]>(
    () => [
      {
        id: 'order_no',
        header: 'Order No.',
        cell: ({ row }) => (
          <span className="number font-medium text-white">{row.original.order_no}</span>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => (
          <span className="text-sm text-white/70">{row.original.supplier_name}</span>
        ),
      },
      {
        id: 'order_date',
        header: 'Date',
        cell: ({ row }) => (
          <span className="number text-xs text-white/60">
            {formatDate(row.original.order_date)}
          </span>
        ),
      },
      {
        id: 'delivery',
        header: 'Delivery',
        cell: ({ row }) => (
          <span className="number text-xs text-white/40">
            {row.original.expected_delivery_date
              ? formatDate(row.original.expected_delivery_date)
              : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {row.original.status === 'DRAFT' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setApproveTarget(row.original)
                }}
                className="flex items-center gap-1 rounded p-1.5 text-xs text-white/30 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <Check size={12} /> Approve
              </button>
            )}
            {row.original.status === 'APPROVED' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPaymentTarget(row.original.id)
                }}
                className="flex items-center gap-1 rounded p-1.5 text-xs text-white/30 hover:bg-sky-500/10 hover:text-sky-400"
              >
                <CreditCard size={12} /> Payment
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Stock Orders"
        description="Supplier order management"
        actions={
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
          >
            <Plus size={14} /> New Order
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex border-b border-white/8">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusTab(tab)
              resetPage()
            }}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              statusTab === tab
                ? 'border-[#E85D04] text-white'
                : 'border-transparent text-white/45 hover:text-white/70',
            )}
          >
            {tab}
          </button>
        ))}
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
        emptyMessage="No stock orders found"
      />

      {/* Create drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              New Stock Order
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <CreateOrderForm onSuccess={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(v) => !v && setApproveTarget(null)}
        title="Approve Stock Order"
        description={`Approve order ${approveTarget?.order_no} from ${approveTarget?.supplier_name}?`}
        confirmLabel="Approve"
        onConfirm={() => approveTarget && approveMutation.mutate(approveTarget.id)}
      />

      {/* Add payment */}
      {paymentTarget && (
        <AddPaymentDialog
          orderId={paymentTarget}
          onClose={() => setPaymentTarget(null)}
        />
      )}
    </div>
  )
}
