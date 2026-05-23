'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { creditsApi } from '@/lib/api/credits'
import { inventoryApi } from '@/lib/api/inventory'
import { shiftsApi } from '@/lib/api/shifts'
import type {
  CreditCustomer,
  CreditSale,
  DueCollection,
  Product,
  ShiftSession,
} from '@/lib/types'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const TABS = ['Customers', 'Credit Sales', 'Collections'] as const
type Tab = (typeof TABS)[number]

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1 w-fit">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
            active === t
              ? 'bg-[#E85D04] text-white'
              : 'text-white/40 hover:text-white/70',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white',
    'placeholder:text-white/25 outline-none',
    hasError ? 'border-rose-500/50' : 'border-white/10 focus:border-[#E85D04]/60',
  ].join(' ')
}

function selectCls(hasError?: boolean) {
  return inputCls(hasError) + ' cursor-pointer'
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

// ─── Customers Tab ────────────────────────────────────────────────────────────

const customerSchema = z.object({
  customer_name: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  credit_limit: z.number().min(0).optional(),
})
type CustomerForm = z.infer<typeof customerSchema>

function CustomerFormContent({
  customer,
  onSuccess,
}: {
  customer: CreditCustomer | null
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          customer_name: customer.customer_name,
          phone: customer.phone,
          address: customer.address,
          credit_limit: customer.credit_limit,
        }
      : {},
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (customer) {
        await creditsApi.createCustomer({ ...data, id: customer.id })
      } else {
        await creditsApi.createCustomer(data)
      }
      await queryClient.invalidateQueries({ queryKey: ['credit-customers'] })
      toast.success(customer ? 'Customer updated' : 'Customer added')
      onSuccess()
    } catch {
      toast.error('Failed to save customer')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Customer Name" error={errors.customer_name?.message}>
        <input
          {...register('customer_name')}
          placeholder="Full name or company"
          className={inputCls(!!errors.customer_name)}
        />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <input
          {...register('phone')}
          placeholder="+94 77 000 0000"
          className={inputCls(false)}
        />
      </Field>
      <Field label="Address" error={errors.address?.message}>
        <input
          {...register('address')}
          placeholder="Address"
          className={inputCls(false)}
        />
      </Field>
      <Field label="Credit Limit (LKR)" error={errors.credit_limit?.message}>
        <input
          {...register('credit_limit', {
            setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
          })}
          type="number"
          step="0.01"
          placeholder="0.00"
          className={inputCls(false) + ' number'}
        />
      </Field>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Saving…' : customer ? 'Save Changes' : 'Add Customer'}
      </button>
    </form>
  )
}

function CustomersTab() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [search, setSearch] = useState('')
  const [drawerCustomer, setDrawerCustomer] = useState<CreditCustomer | null | undefined>(
    undefined,
  )

  const filters = useMemo(
    () => ({ page, limit, search: search || undefined }),
    [page, limit, search],
  )

  const query = useQuery({
    queryKey: ['credit-customers', filters],
    queryFn: () => creditsApi.listCustomers(filters).then((r) => r.data),
  })

  const columns = useMemo<ColumnDef<CreditCustomer>[]>(
    () => [
      {
        id: 'customer_name',
        header: 'Name',
        cell: ({ row }) => (
          <p className="font-medium text-white">{row.original.customer_name}</p>
        ),
      },
      {
        id: 'phone',
        header: 'Contact',
        cell: ({ row }) => (
          <span className="text-xs text-white/50">{row.original.phone ?? '—'}</span>
        ),
      },
      {
        id: 'credit_limit',
        header: 'Credit Limit',
        cell: ({ row }) => (
          <span className="number text-xs text-white/50">
            {row.original.credit_limit != null
              ? formatCurrency(row.original.credit_limit)
              : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setDrawerCustomer(null)}
          className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
        >
          <Plus size={14} /> Add Customer
        </button>
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
        onSearch={(q) => { setSearch(q); resetPage() }}
        emptyMessage="No credit customers found"
        onRowClick={(row) => setDrawerCustomer(row)}
      />

      <Sheet
        open={drawerCustomer !== undefined}
        onOpenChange={(v) => !v && setDrawerCustomer(undefined)}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              {drawerCustomer ? 'Edit Customer' : 'Add Customer'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {drawerCustomer !== undefined && (
              <CustomerFormContent
                customer={drawerCustomer}
                onSuccess={() => setDrawerCustomer(undefined)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Credit Sales Tab ─────────────────────────────────────────────────────────

const saleSchema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  product_id: z.string().min(1, 'Select a product'),
  quantity: z.number().positive('Must be > 0'),
  unit_price: z.number().positive('Must be > 0'),
  shift_session_id: z.string().optional(),
  due_date: z.string().optional(),
})
type SaleForm = z.infer<typeof saleSchema>

function SaleFormContent({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SaleForm>({ resolver: zodResolver(saleSchema) })

  const customersQuery = useQuery({
    queryKey: ['credit-customers-select', { limit: 200 }],
    queryFn: () => creditsApi.listCustomers({ limit: 200 }).then((r) => r.data),
  })
  const customers: CreditCustomer[] = customersQuery.data?.data ?? []

  const productsQuery = useQuery({
    queryKey: ['products-select', { limit: 200 }],
    queryFn: () => inventoryApi.listProducts({ limit: 200 }).then((r) => r.data),
  })
  const products: Product[] = productsQuery.data?.data ?? []

  const sessionsQuery = useQuery({
    queryKey: ['shift-sessions-select', { limit: 50 }],
    queryFn: () => shiftsApi.listSessions({ limit: 50 }).then((r) => r.data),
  })
  const sessions: ShiftSession[] = sessionsQuery.data?.data ?? []

  const onSubmit = handleSubmit(async (data) => {
    try {
      await creditsApi.createSale({
        ...data,
        shift_session_id: data.shift_session_id || undefined,
        due_date: data.due_date || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['credit-sales'] })
      toast.success('Credit sale recorded')
      onSuccess()
    } catch {
      toast.error('Failed to record credit sale')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Customer" error={errors.customer_id?.message}>
        <select {...register('customer_id')} className={selectCls(!!errors.customer_id)}>
          <option value="" className="bg-[#18181C]">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#18181C]">
              {c.customer_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Product" error={errors.product_id?.message}>
        <select {...register('product_id')} className={selectCls(!!errors.product_id)}>
          <option value="" className="bg-[#18181C]">Select product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#18181C]">
              {p.product_name} ({p.category})
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantity" error={errors.quantity?.message}>
          <input
            {...register('quantity', {
              setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
            })}
            type="number"
            step="0.001"
            placeholder="0.000"
            className={inputCls(!!errors.quantity) + ' number'}
          />
        </Field>
        <Field label="Unit Price (LKR)" error={errors.unit_price?.message}>
          <input
            {...register('unit_price', {
              setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
            })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={inputCls(!!errors.unit_price) + ' number'}
          />
        </Field>
      </div>
      <Field label="Shift Session (optional — for FUEL)" error={errors.shift_session_id?.message}>
        <select
          {...register('shift_session_id')}
          className={selectCls(!!errors.shift_session_id)}
        >
          <option value="" className="bg-[#18181C]">None</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#18181C]">
              {formatDate(s.business_date)} — {s.shift_template?.shift_name ?? s.shift_template_id}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Due Date (optional)" error={errors.due_date?.message}>
        <input
          {...register('due_date')}
          type="date"
          className={inputCls(false) + ' number'}
        />
      </Field>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Saving…' : 'Add Credit Sale'}
      </button>
    </form>
  )
}

function CreditSalesTab() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [page, limit, search, dateFrom, dateTo],
  )

  const query = useQuery({
    queryKey: ['credit-sales', filters],
    queryFn: () => creditsApi.listSales(filters).then((r) => r.data),
  })

  const columns = useMemo<ColumnDef<CreditSale>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <span className="number text-xs text-white/60">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white">
            {row.original.customer?.customer_name ?? row.original.customer_id}
          </span>
        ),
      },
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <span className="text-xs text-white/60">
            {row.original.product?.product_name ?? row.original.product_id}
          </span>
        ),
      },
      {
        id: 'quantity',
        header: 'Qty',
        cell: ({ row }) => (
          <span className="number text-xs text-white/60">
            {row.original.quantity.toFixed(3)}
          </span>
        ),
      },
      {
        id: 'unit_price',
        header: 'Unit Price',
        cell: ({ row }) => (
          <span className="number text-xs text-white/50">
            {formatCurrency(row.original.unit_price)}
          </span>
        ),
      },
      {
        id: 'total_amount',
        header: 'Total',
        cell: ({ row }) => (
          <span className="number text-sm font-medium text-white">
            {formatCurrency(row.original.total_amount)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50"
          />
          <span className="text-white/30 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50"
          />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
        >
          <Plus size={14} /> Add Credit Sale
        </button>
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
        onSearch={(q) => { setSearch(q); resetPage() }}
        emptyMessage="No credit sales found"
      />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[440px]"
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              Add Credit Sale
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <SaleFormContent onSuccess={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Collections Tab ──────────────────────────────────────────────────────────

const collectionSchema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  credit_sale_id: z.string().min(1, 'Select a credit sale'),
  amount_collected: z.number().positive('Must be > 0'),
  collection_date: z.string().min(1, 'Required'),
  payment_method: z.enum(['CASH', 'CHEQUE', 'TRANSFER']),
})
type CollectionForm = z.infer<typeof collectionSchema>

function CollectionFormContent({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CollectionForm>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      collection_date: new Date().toISOString().slice(0, 10),
      payment_method: 'CASH' as const,
    },
  })

  const selectedCustomerId = watch('customer_id')

  const customersQuery = useQuery({
    queryKey: ['credit-customers-select', { limit: 200 }],
    queryFn: () => creditsApi.listCustomers({ limit: 200 }).then((r) => r.data),
  })
  const customers: CreditCustomer[] = customersQuery.data?.data ?? []

  const salesQuery = useQuery({
    queryKey: ['credit-sales-select', selectedCustomerId],
    queryFn: () =>
      creditsApi.listSales({ limit: 100 }).then((r) => r.data),
    enabled: !!selectedCustomerId,
  })
  const filteredSales = (salesQuery.data?.data ?? []).filter(
    (s) => s.customer_id === selectedCustomerId && s.status !== 'SETTLED',
  )

  const onSubmit = handleSubmit(async (data) => {
    try {
      await creditsApi.createCollection(data)
      await queryClient.invalidateQueries({ queryKey: ['due-collections'] })
      await queryClient.invalidateQueries({ queryKey: ['credit-sales'] })
      toast.success('Collection recorded')
      onSuccess()
    } catch {
      toast.error('Failed to record collection')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Customer" error={errors.customer_id?.message}>
        <select {...register('customer_id')} className={selectCls(!!errors.customer_id)}>
          <option value="" className="bg-[#18181C]">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#18181C]">
              {c.customer_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Credit Sale" error={errors.credit_sale_id?.message}>
        <select
          {...register('credit_sale_id')}
          className={selectCls(!!errors.credit_sale_id)}
          disabled={!selectedCustomerId}
        >
          <option value="" className="bg-[#18181C]">Select sale…</option>
          {filteredSales.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#18181C]">
              {formatDate(s.created_at)} — {formatCurrency(s.total_amount)} ({s.status})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount Collected (LKR)" error={errors.amount_collected?.message}>
        <input
          {...register('amount_collected', {
            setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
          })}
          type="number"
          step="0.01"
          placeholder="0.00"
          className={inputCls(!!errors.amount_collected) + ' number'}
        />
      </Field>
      <Field label="Collection Date" error={errors.collection_date?.message}>
        <input
          {...register('collection_date')}
          type="date"
          className={inputCls(!!errors.collection_date) + ' number'}
        />
      </Field>
      <Field label="Payment Method" error={errors.payment_method?.message}>
        <select
          {...register('payment_method')}
          className={selectCls(!!errors.payment_method)}
        >
          <option value="CASH" className="bg-[#18181C]">Cash</option>
          <option value="CHEQUE" className="bg-[#18181C]">Cheque</option>
          <option value="TRANSFER" className="bg-[#18181C]">Transfer</option>
        </select>
      </Field>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Recording…' : 'Record Collection'}
      </button>
    </form>
  )
}

function CollectionsTab() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filters = useMemo(
    () => ({
      page,
      limit,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [page, limit, dateFrom, dateTo],
  )

  const query = useQuery({
    queryKey: ['due-collections', filters],
    queryFn: () => creditsApi.listCollections(filters).then((r) => r.data),
  })

  const columns = useMemo<ColumnDef<DueCollection>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <span className="number text-xs text-white/60">
            {formatDate(row.original.collection_date)}
          </span>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="text-sm font-medium text-white">
            {row.original.customer_id}
          </span>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="number text-sm font-semibold text-emerald-400">
            {formatCurrency(row.original.amount_collected)}
          </span>
        ),
      },
      {
        id: 'payment_method',
        header: 'Method',
        cell: ({ row }) => (
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/60">
            {row.original.payment_method}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage() }}
            className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50"
          />
          <span className="text-white/30 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage() }}
            className="number rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#E85D04]/50"
          />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
        >
          <Plus size={14} /> Record Collection
        </button>
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
        emptyMessage="No collections found"
      />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              Record Collection
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <CollectionFormContent onSuccess={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const [tab, setTab] = useState<Tab>('Customers')

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Credits & Dues"
        description="Credit customers, sales on credit, and due collections"
      />
      <TabBar active={tab} onChange={setTab} />
      {tab === 'Customers' && <CustomersTab />}
      {tab === 'Credit Sales' && <CreditSalesTab />}
      {tab === 'Collections' && <CollectionsTab />}
    </div>
  )
}
