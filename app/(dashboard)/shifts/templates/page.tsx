'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'

import { shiftsApi } from '@/lib/api/shifts'
import type { ShiftTemplate } from '@/lib/types'
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

const TEMPLATES_KEY = (f: object) => ['shift-templates', f]

// ─── Schema ───────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  name:        z.string().min(1, 'Shift name is required'),
  start_time:  z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  end_time:    z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  sequence_no: z.number().int().min(1, 'Sequence must be ≥ 1'),
  status:      z.enum(['ACTIVE', 'INACTIVE']),
})

type TemplateFormValues = z.infer<typeof templateSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white',
    'placeholder:text-white/25 outline-none transition-colors',
    hasError
      ? 'border-rose-500/50 focus:border-rose-500/70 focus:ring-2 focus:ring-rose-500/15'
      : 'border-white/10 focus:border-[#E85D04]/60 focus:ring-2 focus:ring-[#E85D04]/15',
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

function isNightShift(start: string, end: string): boolean {
  if (!start || !end) return false
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em < sh * 60 + sm
}

// ─── Template form ────────────────────────────────────────────────────────────

function TemplateForm({
  template,
  onSuccess,
}: {
  template: ShiftTemplate | null
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: template
      ? {
          name:        template.shift_name,
          start_time:  template.start_time,
          end_time:    template.end_time,
          sequence_no: template.sequence_no,
          status:      template.status as 'ACTIVE' | 'INACTIVE',
        }
      : { status: 'ACTIVE' as const },
  })

  const startTime = watch('start_time')
  const endTime   = watch('end_time')
  const night     = isNightShift(startTime, endTime)

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      shift_name:  data.name,
      start_time:  data.start_time,
      end_time:    data.end_time,
      sequence_no: data.sequence_no,
      ...(template ? { status: data.status } : {}),
    }

    try {
      if (template) {
        await shiftsApi.updateTemplate(template.id, payload)
      } else {
        await shiftsApi.createTemplate(payload)
      }
      await queryClient.invalidateQueries({ queryKey: ['shift-templates'] })
      toast.success(template ? 'Template updated' : 'Template created')
      onSuccess()
    } catch {
      toast.error('Failed to save template')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Shift Name" error={errors.name?.message}>
        <input
          {...register('name')}
          type="text"
          placeholder="Morning Shift"
          className={inputCls(!!errors.name)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Time" error={errors.start_time?.message}>
          <input
            {...register('start_time')}
            type="time"
            className={inputCls(!!errors.start_time)}
          />
        </Field>

        <Field label="End Time" error={errors.end_time?.message}>
          <input
            {...register('end_time')}
            type="time"
            className={inputCls(!!errors.end_time)}
          />
        </Field>
      </div>

      {startTime && endTime && (
        <div
          className={[
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
            night
              ? 'border-sky-500/20 bg-sky-500/8 text-sky-400'
              : 'border-amber-500/20 bg-amber-500/8 text-amber-400',
          ].join(' ')}
        >
          {night ? <Moon size={12} /> : <Sun size={12} />}
          {night
            ? 'Night shift — crosses midnight (auto-detected by backend)'
            : 'Day shift'}
        </div>
      )}

      <Field label="Sequence No." error={errors.sequence_no?.message}>
        <input
          {...register('sequence_no', { setValueAs: (v) => (v === '' || v == null) ? 0 : parseInt(String(v), 10) })}
          type="number"
          min="1"
          placeholder="1"
          className={inputCls(!!errors.sequence_no) + ' number'}
        />
      </Field>

      {template && (
        <Field label="Status" error={errors.status?.message}>
          <select
            {...register('status')}
            className={inputCls(!!errors.status) + ' cursor-pointer'}
          >
            <option value="ACTIVE" className="bg-[#18181C]">Active</option>
            <option value="INACTIVE" className="bg-[#18181C]">Inactive</option>
          </select>
        </Field>
      )}

      <div className="mt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white transition-colors hover:bg-[#F48C06] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : template ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </form>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function TemplateDrawer({
  open,
  onOpenChange,
  template,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: ShiftTemplate | null
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[400px]"
      >
        <SheetHeader className="border-b border-white/5 px-5 py-4">
          <SheetTitle className="font-syne text-base font-semibold text-white">
            {template ? 'Edit Shift Template' : 'New Shift Template'}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <TemplateForm template={template} onSuccess={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftTemplatesPage() {
  const { page, limit, setPage, setLimit, resetPage } = usePagination()
  const [search,     setSearch]     = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ShiftTemplate | null>(null)

  const filters = useMemo(() => ({ page, limit, search }), [page, limit, search])

  const query = useQuery({
    queryKey: TEMPLATES_KEY(filters),
    queryFn:  () => shiftsApi.listTemplates(filters).then((r) => r.data),
  })

  const openAdd = useCallback(() => { setEditTarget(null); setDrawerOpen(true) }, [])
  const openEdit = useCallback((t: ShiftTemplate) => { setEditTarget(t); setDrawerOpen(true) }, [])

  const handleSearch = useCallback(
    (q: string) => { setSearch(q); resetPage() },
    [resetPage],
  )

  const columns = useMemo<ColumnDef<ShiftTemplate>[]>(
    () => [
      {
        id: 'name',
        header: 'Shift Name',
        cell: ({ row }) => (
          <span className="font-medium text-white">{row.original.shift_name}</span>
        ),
      },
      {
        id: 'start_time',
        header: 'Start',
        cell: ({ row }) => (
          <span className="number text-xs text-white/70">{row.original.start_time}</span>
        ),
      },
      {
        id: 'end_time',
        header: 'End',
        cell: ({ row }) => (
          <span className="number text-xs text-white/70">{row.original.end_time}</span>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const night = isNightShift(row.original.start_time, row.original.end_time)
          return (
            <div className="flex items-center gap-1.5">
              {night ? <Moon size={12} className="text-sky-400" /> : <Sun size={12} className="text-amber-400" />}
              <span className="text-xs text-white/50">{night ? 'Night' : 'Day'}</span>
            </div>
          )
        },
      },
      {
        id: 'sequence',
        header: 'Seq',
        cell: ({ row }) => (
          <span className="number text-xs text-white/50">{row.original.sequence_no}</span>
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
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(row.original) }}
              className="rounded p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              <Pencil size={13} />
            </button>
          </div>
        ),
      },
    ],
    [openEdit],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Shift Templates"
        description="Define reusable shift schedules for the station"
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#F48C06]"
          >
            <Plus size={14} />
            New Template
          </button>
        }
      />

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
        emptyMessage="No shift templates defined yet"
        onRowClick={openEdit}
      />

      <TemplateDrawer open={drawerOpen} onOpenChange={setDrawerOpen} template={editTarget} />
    </div>
  )
}
