'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  CheckCircle2,
  Circle,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

import { shiftsApi } from '@/lib/api/shifts'
import { pumpsApi } from '@/lib/api/pumps'
import { staffApi } from '@/lib/api/staff'
import type {
  ShiftSession,
  ShiftTemplate,
  Nozzle,
  Staff,
  MeterReading,
  CashSubmission,
} from '@/lib/types'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'

// ─── Extended session type (detail includes relations) ────────────────────────

interface SessionAssignment {
  id: string
  pumper_id: string
  pumper?: Staff
  pump_id: string
  nozzle_id: string
  nozzle?: Nozzle
}

interface SessionDetail extends ShiftSession {
  assignments?: SessionAssignment[]
  meter_readings?: MeterReading[]
  cash_submissions?: CashSubmission[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(hasError?: boolean) {
  return [
    'w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm text-foreground',
    'placeholder:text-muted-foreground outline-none',
    hasError ? 'border-rose-500/50' : 'border-border focus:border-[#E85D04]/60',
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
      <label className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40 mb-3">
      {children}
    </h3>
  )
}

// ─── Workflow step detection ───────────────────────────────────────────────────

function getCompletedSteps(session: SessionDetail): number {
  if (session.status === 'CANCELLED') return 0
  if (session.status === 'DRAFT') return 0
  if (session.status === 'CLOSED') return 6

  let step = 1
  if ((session.assignments ?? []).length > 0) step = 2
  if ((session.meter_readings ?? []).some((r) => r.opening_reading != null)) step = 3
  if ((session.meter_readings ?? []).some((r) => r.closing_reading != null)) step = 4
  if ((session.cash_submissions ?? []).length > 0) step = 5
  return step
}

// ─── Horizontal Timeline Stepper ─────────────────────────────────────────────

const STEPS = [
  { label: 'Created' },
  { label: 'Opened' },
  { label: 'Assignments' },
  { label: 'Opening Readings' },
  { label: 'Closing Readings' },
  { label: 'Cash Submitted' },
  { label: 'Closed' },
]

function stepTimestamp(session: SessionDetail, i: number): string | undefined {
  if (i === 0) return session.created_at
  if (i === 1) return session.opened_at
  if (i === 6) return session.closed_at
  return undefined
}

function TimelineStepper({ session }: { session: SessionDetail }) {
  const completedSteps = getCompletedSteps(session)

  return (
    <div className="flex items-start overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const done = i <= completedSteps
        const isLast = i === STEPS.length - 1
        const ts = stepTimestamp(session, i)

        return (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center gap-1" style={{ minWidth: 76 }}>
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors',
                  done ? 'border-[#E85D04] bg-[#E85D04]' : 'border-foreground/20 bg-transparent',
                )}
              >
                {done ? (
                  <CheckCircle2 size={14} className="text-white" />
                ) : (
                  <Circle size={14} className="text-foreground/20" />
                )}
              </div>
              <p
                className={cn(
                  'text-center text-[10px] leading-tight',
                  done ? 'text-foreground/70' : 'text-foreground/25',
                )}
              >
                {step.label}
              </p>
              {ts && done && (
                <p className="number text-center text-[9px] text-foreground/30 leading-tight">
                  {formatDateTime(ts)}
                </p>
              )}
            </div>
            {!isLast && (
              <div className="mt-3 mx-0.5 flex items-center">
                <div
                  className={cn(
                    'h-0.5 w-5 transition-colors',
                    i < completedSteps ? 'bg-[#E85D04]' : 'bg-foreground/10',
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Create Session Modal ─────────────────────────────────────────────────────

const createSchema = z.object({
  shift_template_id: z.string().min(1, 'Select a shift template'),
  business_date: z.string().min(1, 'Required'),
})
type CreateForm = z.infer<typeof createSchema>

function CreateSessionModal({
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
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const templatesQuery = useQuery({
    queryKey: ['shift-templates', { limit: 100 }],
    queryFn: () => shiftsApi.listTemplates({ limit: 100 }).then((r) => r.data),
  })
  const templates: ShiftTemplate[] = templatesQuery.data?.data ?? []

  const onSubmit = handleSubmit(async (data) => {
    try {
      await shiftsApi.createSession(data)
      await queryClient.invalidateQueries({ queryKey: ['shift-sessions'] })
      toast.success('Session created')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to create session')
    }
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-syne text-base font-semibold text-foreground">New Shift Session</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Shift Template" error={errors.shift_template_id?.message}>
            <select
              {...register('shift_template_id')}
              className={selectCls(!!errors.shift_template_id)}
            >
              <option value="" className="bg-card">Select template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id} className="bg-card">
                  {t.shift_name} ({t.start_time} – {t.end_time})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Business Date" error={errors.business_date?.message}>
            <input
              {...register('business_date')}
              type="date"
              className={inputCls(!!errors.business_date) + ' number'}
            />
          </Field>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create Session'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Add Assignment Modal ─────────────────────────────────────────────────────

const assignSchema = z.object({
  nozzle_id: z.string().min(1, 'Select a nozzle'),
  pumper_id: z.string().min(1, 'Select a pumper'),
})
type AssignForm = z.infer<typeof assignSchema>

function AddAssignmentModal({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignForm>({ resolver: zodResolver(assignSchema) })

  const nozzlesQuery = useQuery({
    queryKey: ['pump-nozzles', { limit: 100 }],
    queryFn: () => pumpsApi.listNozzles({ limit: 100 }).then((r) => r.data),
    enabled: open,
  })
  const nozzles: Nozzle[] = nozzlesQuery.data?.data ?? []

  const rolesQuery = useQuery({
    queryKey: ['operational-roles', { limit: 100 }],
    queryFn: () => staffApi.listRoles({ limit: 100 }).then((r) => r.data),
    enabled: open,
  })
  const pumperRoleIds = useMemo(
    () =>
      (rolesQuery.data?.data ?? [])
        .filter((r) => r.liable_for_cash_shortfall)
        .map((r) => r.id),
    [rolesQuery.data],
  )

  const staffQuery = useQuery({
    queryKey: ['staff', { status: 'ACTIVE', limit: 100 }],
    queryFn: () => staffApi.list({ status: 'ACTIVE', limit: 100 }).then((r) => r.data),
    enabled: open,
  })
  const pumpers: Staff[] = useMemo(
    () =>
      (staffQuery.data?.data ?? []).filter((s) =>
        pumperRoleIds.includes(s.operational_role_id),
      ),
    [staffQuery.data, pumperRoleIds],
  )

  const onSubmit = handleSubmit(async (data) => {
    try {
      await shiftsApi.setAssignments(sessionId, [
        { pumper_id: data.pumper_id, nozzle_id: data.nozzle_id },
      ])
      await queryClient.invalidateQueries({ queryKey: ['shift-session', sessionId] })
      toast.success('Assignment added')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to add assignment')
    }
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-syne text-base font-semibold text-foreground">Add Assignment</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nozzle" error={errors.nozzle_id?.message}>
            <select {...register('nozzle_id')} className={selectCls(!!errors.nozzle_id)}>
              <option value="" className="bg-card">Select nozzle…</option>
              {nozzles.map((n) => (
                <option key={n.id} value={n.id} className="bg-card">
                  {n.nozzle_name} ({n.nozzle_code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pumper" error={errors.pumper_id?.message}>
            <select {...register('pumper_id')} className={selectCls(!!errors.pumper_id)}>
              <option value="" className="bg-card">Select pumper…</option>
              {pumpers.map((s) => (
                <option key={s.id} value={s.id} className="bg-card">
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
          >
            {isSubmitting ? 'Adding…' : 'Add Assignment'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Assignments Section ──────────────────────────────────────────────────────

function AssignmentsSection({ session }: { session: SessionDetail }) {
  const [addOpen, setAddOpen] = useState(false)
  const assignments = session.assignments ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>Pumper Assignments</SectionHeading>
        {session.status === 'OPEN' && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-foreground/30 hover:border-[#E85D04]/40 hover:text-[#E85D04]/70 transition-colors"
          >
            <Plus size={11} /> Add Assignment
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className="text-xs text-foreground/25 text-center py-4">No assignments yet</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                  Nozzle
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                  Code
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                  Pumper
                </th>
                {session.status === 'OPEN' && <th className="w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-foreground/70">
                    {a.nozzle?.nozzle_name ?? a.nozzle_id}
                  </td>
                  <td className="px-3 py-2 number text-foreground/40">
                    {a.nozzle?.nozzle_code ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-foreground/70">{a.pumper?.name ?? a.pumper_id}</td>
                  {session.status === 'OPEN' && (
                    <td className="px-2 py-2">
                      <button
                        className="rounded p-1 text-foreground/15 hover:bg-rose-500/10 hover:text-rose-400"
                        title="Remove"
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddAssignmentModal
        sessionId={session.id}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  )
}

// ─── Opening Readings Section ─────────────────────────────────────────────────

function OpeningReadingsSection({ session }: { session: SessionDetail }) {
  const queryClient = useQueryClient()
  const assignments = session.assignments ?? []
  const existingReadings = session.meter_readings ?? []

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    existingReadings.forEach((r) => {
      if (r.opening_reading != null) init[r.nozzle_id] = String(r.opening_reading)
    })
    return init
  })
  const [saving, setSaving] = useState(false)

  const hasOpeningReadings = existingReadings.some((r) => r.opening_reading != null)

  async function handleSave() {
    setSaving(true)
    try {
      const readings = assignments
        .filter((a) => values[a.nozzle_id] !== '' && values[a.nozzle_id] != null)
        .map((a) => ({
          nozzle_id: a.nozzle_id,
          meter_reading: parseFloat(values[a.nozzle_id] ?? '0'),
        }))
      await shiftsApi.setOpeningReadings(session.id, readings)
      await queryClient.invalidateQueries({ queryKey: ['shift-session', session.id] })
      toast.success('Opening readings saved')
    } catch {
      toast.error('Failed to save opening readings')
    } finally {
      setSaving(false)
    }
  }

  if (assignments.length === 0) {
    return (
      <div>
        <SectionHeading>Opening Readings</SectionHeading>
        <p className="text-xs text-foreground/25 text-center py-4">Add assignments first</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Opening Readings</SectionHeading>
      <div className="rounded-lg border border-border overflow-hidden mb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                Nozzle
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                Opening Reading
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((a) => (
              <tr key={a.nozzle_id} className="hover:bg-muted/20">
                <td className="px-3 py-2.5 text-foreground/70">
                  {a.nozzle?.nozzle_name ?? a.nozzle_id}
                  <span className="number ml-2 text-[10px] text-foreground/30">
                    {a.nozzle?.nozzle_code}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.001"
                    value={values[a.nozzle_id] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [a.nozzle_id]: e.target.value }))
                    }
                    placeholder="0.000"
                    disabled={hasOpeningReadings && session.status !== 'OPEN'}
                    className="number w-32 rounded border border-border bg-muted/50 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#E85D04]/60 disabled:opacity-40"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {session.status === 'OPEN' && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-[#E85D04]/80 text-sm font-semibold text-white hover:bg-[#E85D04] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Opening Readings'}
        </button>
      )}
    </div>
  )
}

// ─── Closing Readings Section ─────────────────────────────────────────────────

function ClosingReadingsSection({ session }: { session: SessionDetail }) {
  const queryClient = useQueryClient()
  const assignments = session.assignments ?? []
  const existingReadings = session.meter_readings ?? []

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    existingReadings.forEach((r) => {
      if (r.closing_reading != null) init[r.nozzle_id] = String(r.closing_reading)
    })
    return init
  })
  const [saving, setSaving] = useState(false)

  function getOpening(nozzleId: string) {
    return existingReadings.find((r) => r.nozzle_id === nozzleId)?.opening_reading
  }
  function getCapacity(nozzleId: string) {
    return existingReadings.find((r) => r.nozzle_id === nozzleId)?.meter_capacity ?? 99999.999
  }
  function calcDispensed(nozzleId: string): { litres: number; rollover: boolean } | null {
    const opening = getOpening(nozzleId)
    const closingStr = values[nozzleId]
    if (opening == null || !closingStr) return null
    const closing = parseFloat(closingStr)
    if (isNaN(closing)) return null
    const rollover = closing < opening
    const litres = rollover ? getCapacity(nozzleId) - opening + closing : closing - opening
    return { litres, rollover }
  }

  const hasOpeningReadings = existingReadings.some((r) => r.opening_reading != null)

  async function handleSave() {
    setSaving(true)
    try {
      const readings = assignments
        .filter((a) => values[a.nozzle_id] !== '' && values[a.nozzle_id] != null)
        .map((a) => ({
          nozzle_id: a.nozzle_id,
          meter_reading: parseFloat(values[a.nozzle_id] ?? '0'),
        }))
      await shiftsApi.setClosingReadings(session.id, readings)
      await queryClient.invalidateQueries({ queryKey: ['shift-session', session.id] })
      toast.success('Closing readings saved')
    } catch {
      toast.error('Failed to save closing readings')
    } finally {
      setSaving(false)
    }
  }

  if (!hasOpeningReadings) {
    return (
      <div>
        <SectionHeading>Closing Readings</SectionHeading>
        <p className="text-xs text-foreground/25 text-center py-4">Save opening readings first</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Closing Readings</SectionHeading>
      <div className="rounded-lg border border-border overflow-hidden mb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                Nozzle
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                Opening
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                Closing
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                Dispensed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((a) => {
              const opening = getOpening(a.nozzle_id)
              const disp = calcDispensed(a.nozzle_id)
              return (
                <tr key={a.nozzle_id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-foreground/70">
                    {a.nozzle?.nozzle_name ?? a.nozzle_id}
                  </td>
                  <td className="px-3 py-2 number text-foreground/40">
                    {opening != null ? opening.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.001"
                      value={values[a.nozzle_id] ?? ''}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [a.nozzle_id]: e.target.value }))
                      }
                      placeholder="0.000"
                      disabled={session.status !== 'OPEN'}
                      className="number w-28 rounded border border-border bg-muted/50 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#E85D04]/60 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {disp ? (
                      <div className="flex items-center gap-1.5">
                        <span className="number font-medium text-[#F48C06]">
                          {disp.litres.toFixed(3)} L
                        </span>
                        {disp.rollover && (
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-rose-500/15 text-rose-400">
                            Rollover
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-foreground/20">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {session.status === 'OPEN' && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-[#E85D04]/80 text-sm font-semibold text-white hover:bg-[#E85D04] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Closing Readings'}
        </button>
      )}
    </div>
  )
}

// ─── Cash Submissions Section ─────────────────────────────────────────────────

function CashSubmissionsSection({ session }: { session: SessionDetail }) {
  const queryClient = useQueryClient()
  const assignments = session.assignments ?? []
  const existingSubmissions = session.cash_submissions ?? []

  const uniquePumperIds = [...new Set(assignments.map((a) => a.pumper_id))]

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    existingSubmissions.forEach((s) => {
      init[s.pumper_id] = String(s.actual_cash)
    })
    return init
  })
  const [submitting, setSubmitting] = useState<string | null>(null)

  const hasClosingReadings = (session.meter_readings ?? []).some(
    (r) => r.closing_reading != null,
  )

  async function handleSubmitCash(pumperId: string) {
    const val = values[pumperId]
    if (!val) return
    setSubmitting(pumperId)
    try {
      await shiftsApi.setCashSubmissions(session.id, [
        { pumper_id: pumperId, actual_cash: parseFloat(val) },
      ])
      await queryClient.invalidateQueries({ queryKey: ['shift-session', session.id] })
      toast.success('Cash submission saved')
    } catch {
      toast.error('Failed to save cash submission')
    } finally {
      setSubmitting(null)
    }
  }

  if (!hasClosingReadings) {
    return (
      <div>
        <SectionHeading>Cash Submissions</SectionHeading>
        <p className="text-xs text-foreground/25 text-center py-4">
          Save closing readings first
        </p>
      </div>
    )
  }

  if (uniquePumperIds.length === 0) {
    return (
      <div>
        <SectionHeading>Cash Submissions</SectionHeading>
        <p className="text-xs text-foreground/25 text-center py-4">No pumpers assigned</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Cash Submissions</SectionHeading>
      <div className="flex flex-col gap-2">
        {uniquePumperIds.map((pumperId) => {
          const assignment = assignments.find((a) => a.pumper_id === pumperId)
          const pumperName = assignment?.pumper?.name ?? pumperId
          const existing = existingSubmissions.find((s) => s.pumper_id === pumperId)
          const expectedCash = existing?.expected_cash
          const actualStr = values[pumperId] ?? ''
          const actualNum = actualStr ? parseFloat(actualStr) : null
          const diff =
            expectedCash != null && actualNum != null ? actualNum - expectedCash : null

          return (
            <div
              key={pumperId}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pumperName}</p>
                {expectedCash != null && (
                  <p className="number text-[10px] text-foreground/35 mt-0.5">
                    Expected: LKR{' '}
                    {expectedCash.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {diff != null && (
                  <span
                    className={cn(
                      'number text-xs font-semibold px-2 py-0.5 rounded',
                      diff < 0
                        ? 'bg-rose-500/15 text-rose-400'
                        : diff > 0
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-muted/50 text-foreground/40',
                    )}
                  >
                    {diff < 0 ? '-' : '+'}LKR{' '}
                    {Math.abs(diff).toLocaleString('en-LK', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )}
                <input
                  type="number"
                  step="0.01"
                  value={actualStr}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [pumperId]: e.target.value }))
                  }
                  placeholder="0.00"
                  disabled={session.status !== 'OPEN'}
                  className="number w-28 rounded border border-border bg-muted/50 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#E85D04]/60 disabled:opacity-40"
                />
                {session.status === 'OPEN' && (
                  <button
                    onClick={() => handleSubmitCash(pumperId)}
                    disabled={!actualStr || submitting === pumperId}
                    className="rounded-lg bg-[#E85D04]/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#E85D04] disabled:opacity-50"
                  >
                    {submitting === pumperId ? '…' : 'Submit'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Session Detail Panel ─────────────────────────────────────────────────────

function SessionDetailPanel({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient()
  const [closeConfirm, setCloseConfirm] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ['shift-session', sessionId],
    queryFn: () => shiftsApi.getSession(sessionId).then((r) => r.data as SessionDetail),
    refetchInterval: 15_000,
  })
  const session = sessionQuery.data

  const openMutation = useMutation({
    mutationFn: () => shiftsApi.openSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['shift-sessions'] })
      toast.success('Shift opened')
    },
    onError: () => toast.error('Failed to open shift'),
  })

  const closeMutation = useMutation({
    mutationFn: () => {
      const closingReadings = (session?.meter_readings ?? [])
        .filter((r) => r.closing_reading != null)
        .map((r) => ({ nozzle_id: r.nozzle_id, meter_reading: r.closing_reading as number }))
      const cashSubmissions = (session?.cash_submissions ?? [])
        .map((s) => ({ pumper_id: s.pumper_id, actual_cash: s.actual_cash }))
      return shiftsApi.closeSession(sessionId, closingReadings, cashSubmissions)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['shift-sessions'] })
      toast.success('Shift closed — stock deducted')
    },
    onError: () => toast.error('Failed to close shift'),
  })

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-[#E85D04]" />
      </div>
    )
  }

  const completedSteps = getCompletedSteps(session)
  const canClose = session.status === 'OPEN' && completedSteps >= 5

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border px-6 py-4 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-syne text-base font-semibold text-foreground truncate">
            {session.shift_template?.shift_name ?? 'Session'} — {formatDate(session.business_date)}
          </p>
          <div className="mt-1.5">
            <StatusBadge status={session.status} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <TimelineStepper session={session} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Section 1 — Open Shift */}
        {session.status === 'DRAFT' && (
          <div>
            <SectionHeading>Open Shift</SectionHeading>
            <button
              onClick={() => openMutation.mutate()}
              disabled={openMutation.isPending}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
            >
              {openMutation.isPending ? 'Opening…' : 'Open Shift'}
            </button>
          </div>
        )}

        {/* Section 2 — Assignments */}
        <AssignmentsSection session={session} />

        {/* Section 3 — Opening Readings */}
        <OpeningReadingsSection session={session} />

        {/* Section 4 — Closing Readings */}
        <ClosingReadingsSection session={session} />

        {/* Section 5 — Cash Submissions */}
        <CashSubmissionsSection session={session} />

        {/* Section 6 — Close Shift */}
        {canClose && (
          <div>
            <SectionHeading>Close Shift</SectionHeading>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  This will lock the shift. Stock will be deducted. This cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCloseConfirm(true)}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-500"
            >
              Close Shift
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={closeConfirm}
        onOpenChange={(v) => !v && setCloseConfirm(false)}
        title="Close Shift Session?"
        description="This will lock the shift. Stock will be deducted. This cannot be undone."
        confirmLabel="Close Shift"
        variant="danger"
        onConfirm={() => closeMutation.mutate()}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftSessionsPage() {
  const { page, limit, sortBy, sortOrder, setPage, setLimit, setSort, resetPage } = usePagination()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: statusFilter || undefined,
      date_from: dateFilter || undefined,
      date_to: dateFilter || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    }),
    [page, limit, search, statusFilter, dateFilter, sortBy, sortOrder],
  )

  const query = useQuery({
    queryKey: ['shift-sessions', filters],
    queryFn: () => shiftsApi.listSessions(filters).then((r) => r.data),
  })

  const columns = useMemo<ColumnDef<ShiftSession>[]>(
    () => [
      {
        id: 'business_date',
        header: 'Business Date',
        meta: { sortKey: 'business_date', defaultSortDir: 'DESC' as const },
        cell: ({ row }) => (
          <span className="number text-sm font-medium text-foreground">
            {formatDate(row.original.business_date)}
          </span>
        ),
      },
      {
        id: 'shift_name',
        header: 'Shift',
        cell: ({ row }) => (
          <span className="text-sm text-foreground/70">
            {row.original.shift_template?.shift_name ?? row.original.shift_template_id}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { sortKey: 'status', defaultSortDir: 'ASC' as const },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'opened_at',
        header: 'Opened At',
        meta: { sortKey: 'opened_at', defaultSortDir: 'DESC' as const },
        cell: ({ row }) => (
          <span className="number text-xs text-foreground/40">
            {row.original.opened_at ? formatDateTime(row.original.opened_at) : '—'}
          </span>
        ),
      },
      {
        id: 'closed_at',
        header: 'Closed At',
        meta: { sortKey: 'closed_at', defaultSortDir: 'DESC' as const },
        cell: ({ row }) => (
          <span className="number text-xs text-foreground/40">
            {row.original.closed_at ? formatDateTime(row.original.closed_at) : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedId(row.original.id)
              }}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground/30 hover:bg-muted/50 hover:text-foreground/60"
            >
              View <ChevronRight size={12} />
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
        title="Shift Sessions"
        description="Manage daily shift sessions and workflow"
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
          >
            <Plus size={14} /> New Session
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value)
            resetPage()
          }}
          className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground outline-none focus:border-[#E85D04]/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            resetPage()
          }}
          className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground outline-none focus:border-[#E85D04]/50 cursor-pointer"
        >
          <option value="" className="bg-card">All Statuses</option>
          <option value="DRAFT" className="bg-card">Draft</option>
          <option value="OPEN" className="bg-card">Open</option>
          <option value="CLOSED" className="bg-card">Closed</option>
          <option value="CANCELLED" className="bg-card">Cancelled</option>
        </select>
        {(dateFilter || statusFilter) && (
          <button
            onClick={() => {
              setDateFilter('')
              setStatusFilter('')
              resetPage()
            }}
            className="text-xs text-foreground/30 hover:text-foreground/60"
          >
            Clear filters
          </button>
        )}
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
        onSearch={(q) => {
          setSearch(q)
          resetPage()
        }}
        emptyMessage="No shift sessions found"
        onRowClick={(row) => setSelectedId(row.id)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSort}
      />

      <CreateSessionModal open={createOpen} onOpenChange={setCreateOpen} />

      <Sheet open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-border bg-card p-0 sm:max-w-[700px]"
        >
          {selectedId && <SessionDetailPanel sessionId={selectedId} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}
