'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Check } from 'lucide-react'
import { toast } from 'sonner'

import { payrollApi } from '@/lib/api/payroll'
import type { PayrollRun, SalaryDeduction } from '@/lib/types'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Payroll Runs', 'Salary Deductions'] as const
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

// ─── Create Payroll Run Form ──────────────────────────────────────────────────

const runSchema = z.object({
  period_from: z.string().min(1, 'Required'),
  period_to: z.string().min(1, 'Required'),
})
type RunForm = z.infer<typeof runSchema>

function CreatePayrollRunForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RunForm>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      period_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10),
      period_to: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await payrollApi.createRun(data)
      await queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      toast.success('Payroll run created')
      onSuccess()
    } catch {
      toast.error('Failed to create payroll run')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Period From" error={errors.period_from?.message}>
        <input
          {...register('period_from')}
          type="date"
          className={inputCls(!!errors.period_from) + ' number'}
        />
      </Field>
      <Field label="Period To" error={errors.period_to?.message}>
        <input
          {...register('period_to')}
          type="date"
          className={inputCls(!!errors.period_to) + ' number'}
        />
      </Field>
      <p className="text-xs text-white/35">
        Leave staff IDs blank to include all active staff in the payroll run.
      </p>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
      >
        {isSubmitting ? 'Creating…' : 'Create Payroll Run'}
      </button>
    </form>
  )
}

// ─── Payroll Runs Tab ─────────────────────────────────────────────────────────

function PayrollRunsTab() {
  const queryClient = useQueryClient()
  const { page, limit, setPage, setLimit } = usePagination()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [finalizeTarget, setFinalizeTarget] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['payroll-runs', { page, limit }],
    queryFn: () => payrollApi.listRuns({ page, limit }).then((r) => r.data),
  })

  const finalizeMutation = useMutation({
    mutationFn: (id: string) => payrollApi.finalizeRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      setFinalizeTarget(null)
      toast.success('Payroll run finalized')
    },
    onError: () => toast.error('Failed to finalize payroll run'),
  })

  const columns = useMemo<ColumnDef<PayrollRun>[]>(
    () => [
      {
        id: 'period_from',
        header: 'Period From',
        cell: ({ row }) => (
          <span className="number text-sm text-white">
            {formatDate(row.original.period_from)}
          </span>
        ),
      },
      {
        id: 'period_to',
        header: 'Period To',
        cell: ({ row }) => (
          <span className="number text-sm text-white/70">
            {formatDate(row.original.period_to)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="number text-xs text-white/40">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            {row.original.status === 'DRAFT' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFinalizeTarget(row.original.id)
                }}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
              >
                <Check size={11} /> Finalize
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
        >
          <Plus size={14} /> Create Payroll Run
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
        emptyMessage="No payroll runs found"
      />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[400px]"
        >
          <SheetHeader className="border-b border-white/5 px-5 py-4">
            <SheetTitle className="font-syne text-base font-semibold text-white">
              Create Payroll Run
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <CreatePayrollRunForm onSuccess={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!finalizeTarget}
        onOpenChange={(v) => !v && setFinalizeTarget(null)}
        title="Finalize Payroll Run?"
        description="This will lock the run and calculate final net salaries. Deductions cannot be re-included once finalized."
        confirmLabel="Finalize"
        variant="default"
        onConfirm={() => finalizeTarget && finalizeMutation.mutate(finalizeTarget)}
      />
    </>
  )
}

// ─── Salary Deductions Tab ────────────────────────────────────────────────────

const DEDUCTION_STATUSES = ['ALL', 'PENDING', 'APPROVED'] as const
type DeductionStatusFilter = (typeof DEDUCTION_STATUSES)[number]

function SalaryDeductionsTab() {
  const queryClient = useQueryClient()
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [statusFilter, setStatusFilter] = useState<DeductionStatusFilter>('ALL')

  const filters = useMemo(
    () => ({
      page,
      limit,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    [page, limit, statusFilter],
  )

  const query = useQuery({
    queryKey: ['salary-deductions', filters],
    queryFn: () => payrollApi.listDeductions(filters).then((r) => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => payrollApi.approveDeduction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-deductions'] })
      toast.success('Deduction approved')
    },
    onError: () => toast.error('Failed to approve deduction'),
  })

  const columns = useMemo<ColumnDef<SalaryDeduction>[]>(
    () => [
      {
        id: 'staff',
        header: 'Staff',
        cell: ({ row }) => (
          <p className="font-medium text-white">
            {row.original.staff?.name ?? row.original.staff_id}
          </p>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="number text-sm font-semibold text-rose-400">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        id: 'reason',
        header: 'Reason',
        cell: ({ row }) => (
          <span className="text-xs text-white/60 max-w-[200px] truncate block">
            {row.original.reason}
          </span>
        ),
      },
      {
        id: 'created_at',
        header: 'Date',
        cell: ({ row }) => (
          <span className="number text-xs text-white/40">
            {formatDate(row.original.created_at)}
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
          <div className="flex justify-end">
            {row.original.status === 'PENDING' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  approveMutation.mutate(row.original.id)
                }}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors disabled:opacity-40"
              >
                <Check size={11} /> Approve
              </button>
            )}
          </div>
        ),
      },
    ],
    [approveMutation],
  )

  return (
    <>
      {/* Status filter */}
      <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1 w-fit">
        {DEDUCTION_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); resetPage() }}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === s
                ? 'bg-[#E85D04] text-white'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
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
        emptyMessage="No salary deductions found"
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [tab, setTab] = useState<Tab>('Payroll Runs')

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Payroll"
        description="Payroll runs and salary deduction management"
      />
      <TabBar active={tab} onChange={setTab} />
      {tab === 'Payroll Runs' && <PayrollRunsTab />}
      {tab === 'Salary Deductions' && <SalaryDeductionsTab />}
    </div>
  )
}
