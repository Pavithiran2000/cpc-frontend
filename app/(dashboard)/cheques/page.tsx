'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import { chequesApi } from '@/lib/api/cheques'
import type { Cheque, ChequeStatus } from '@/lib/types'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ─── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = ['ALL', 'RECEIVED', 'DEPOSITED', 'CLEARED', 'RETURNED', 'CANCELLED'] as const
type StatusTab = (typeof STATUS_TABS)[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Add Cheque Form ──────────────────────────────────────────────────────────

const chequeSchema = z.object({
  cheque_no: z.string().min(1, 'Required'),
  bank_name: z.string().min(1, 'Required'),
  branch_name: z.string().optional(),
  amount: z.number().positive('Must be > 0'),
  received_date: z.string().min(1, 'Required'),
  cheque_date: z.string().optional(),
})
type ChequeFormValues = z.infer<typeof chequeSchema>

function ChequeFormContent({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChequeFormValues>({
    resolver: zodResolver(chequeSchema),
    defaultValues: {
      received_date: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await chequesApi.create({
        ...data,
        branch_name: data.branch_name || undefined,
        cheque_date: data.cheque_date || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['cheques'] })
      toast.success('Cheque added')
      onSuccess()
    } catch {
      toast.error('Failed to add cheque')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cheque No." error={errors.cheque_no?.message}>
          <input
            {...register('cheque_no')}
            placeholder="CHQ-001"
            className={inputCls(!!errors.cheque_no) + ' number'}
          />
        </Field>
        <Field label="Amount (LKR)" error={errors.amount?.message}>
          <input
            {...register('amount', {
              setValueAs: (v) => (v === '' || v == null) ? undefined : parseFloat(v),
            })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={inputCls(!!errors.amount) + ' number'}
          />
        </Field>
      </div>
      <Field label="Bank Name" error={errors.bank_name?.message}>
        <input
          {...register('bank_name')}
          placeholder="Bank name"
          className={inputCls(!!errors.bank_name)}
        />
      </Field>
      <Field label="Branch" error={errors.branch_name?.message}>
        <input
          {...register('branch_name')}
          placeholder="Branch (optional)"
          className={inputCls(false)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cheque Date" error={errors.cheque_date?.message}>
          <input
            {...register('cheque_date')}
            type="date"
            className={inputCls(false) + ' number'}
          />
        </Field>
        <Field label="Received Date" error={errors.received_date?.message}>
          <input
            {...register('received_date')}
            type="date"
            className={inputCls(!!errors.received_date) + ' number'}
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Adding…' : 'Add Cheque'}
      </button>
    </form>
  )
}

// ─── Status update dropdown ────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<string, ChequeStatus[]> = {
  RECEIVED: ['DEPOSITED', 'RETURNED', 'CANCELLED'],
  DEPOSITED: ['CLEARED', 'RETURNED', 'CANCELLED'],
  CLEARED: [],
  RETURNED: ['CANCELLED'],
  CANCELLED: [],
}

function StatusUpdateMenu({ cheque }: { cheque: Cheque }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: (status: ChequeStatus) =>
      chequesApi.updateStatus(cheque.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] })
      setOpen(false)
      toast.success('Cheque status updated')
    },
    onError: () => toast.error('Failed to update cheque status'),
  })

  const transitions = STATUS_TRANSITIONS[cheque.status] ?? []
  if (transitions.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/50 hover:border-white/20 hover:text-white/80 transition-colors"
      >
        Update <ChevronDown size={11} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[130px] rounded-lg border border-white/10 bg-[#18181C] py-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {transitions.map((s) => (
            <button
              key={s}
              onClick={() => mutation.mutate(s)}
              disabled={mutation.isPending}
              className="w-full px-3 py-1.5 text-left text-xs text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChequesPage() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [statusTab, setStatusTab] = useState<StatusTab>('ALL')
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: statusTab === 'ALL' ? undefined : statusTab,
    }),
    [page, limit, search, statusTab],
  )

  const query = useQuery({
    queryKey: ['cheques', filters],
    queryFn: () => chequesApi.list(filters).then((r) => r.data),
  })

  const columns = useMemo<ColumnDef<Cheque>[]>(
    () => [
      {
        id: 'cheque_no',
        header: 'Cheque #',
        cell: ({ row }) => (
          <span className="number text-sm font-medium text-white">
            {row.original.cheque_no}
          </span>
        ),
      },
      {
        id: 'bank_name',
        header: 'Bank',
        cell: ({ row }) => (
          <div>
            <p className="text-sm text-white/70">{row.original.bank_name}</p>
            {row.original.branch_name && (
              <p className="text-[10px] text-white/35">{row.original.branch_name}</p>
            )}
          </div>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="number text-sm font-semibold text-white">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        id: 'cheque_date',
        header: 'Cheque Date',
        cell: ({ row }) => (
          <span className="number text-xs text-white/50">
            {row.original.cheque_date ? formatDate(row.original.cheque_date) : '—'}
          </span>
        ),
      },
      {
        id: 'received_date',
        header: 'Received',
        cell: ({ row }) => (
          <span className="number text-xs text-white/50">
            {formatDate(row.original.received_date)}
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
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <StatusUpdateMenu cheque={row.original} />
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Cheques"
        description="Cheque management and status tracking"
        actions={
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
          >
            <Plus size={14} /> Add Cheque
          </button>
        }
      />

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setStatusTab(t); resetPage() }}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              statusTab === t
                ? 'bg-[#E85D04] text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
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
        searchable
        onSearch={(q) => { setSearch(q); resetPage() }}
        emptyMessage="No cheques found"
      />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              Add Cheque
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <ChequeFormContent onSuccess={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
