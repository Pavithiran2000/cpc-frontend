'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Fuel } from 'lucide-react'
import { toast } from 'sonner'

import { pumpsApi } from '@/lib/api/pumps'
import { inventoryApi } from '@/lib/api/inventory'
import type { Pump, Nozzle, Product } from '@/lib/types'
import { cn } from '@/lib/utils'

import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

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

// ─── Add Pump Sheet (with inline nozzle builder) ──────────────────────────────

const nozzleRowSchema = z.object({
  nozzle_code:     z.string().min(1, 'Required'),
  nozzle_name:     z.string().min(1, 'Required'),
  fuel_product_id: z.string().min(1, 'Required'),
  meter_capacity:  z.number().positive('> 0'),
})

const addPumpSchema = z.object({
  pump_code: z.string().min(1, 'Required'),
  pump_name: z.string().min(1, 'Required'),
  status:    z.enum(['ACTIVE', 'INACTIVE']),
  nozzles:   z.array(nozzleRowSchema).min(1, 'At least one nozzle required'),
})

type AddPumpForm = z.infer<typeof addPumpSchema>

function AddPumpSheet({
  open,
  onOpenChange,
  fuelProducts,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  fuelProducts: Product[]
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddPumpForm>({
    resolver: zodResolver(addPumpSchema),
    defaultValues: {
      status: 'ACTIVE' as const,
      nozzles: [
        { nozzle_code: '', nozzle_name: '', fuel_product_id: '', meter_capacity: 99999.999 },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'nozzles' })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await pumpsApi.create({
        pump_code: data.pump_code,
        pump_name: data.pump_name,
        status:    data.status,
        nozzles:   data.nozzles as Parameters<typeof pumpsApi.create>[0]['nozzles'],
      })
      await queryClient.invalidateQueries({ queryKey: ['pumps'] })
      toast.success('Pump added')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to add pump')
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-white/8 bg-[#111114] p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b border-white/5 px-5 py-4">
          <SheetTitle className="font-syne text-base font-semibold text-white">
            New Pump
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {/* Pump details */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pump Code" error={errors.pump_code?.message}>
                <input
                  {...register('pump_code')}
                  placeholder="P-01"
                  className={inputCls(!!errors.pump_code) + ' number uppercase'}
                />
              </Field>
              <Field label="Pump Name" error={errors.pump_name?.message}>
                <input
                  {...register('pump_name')}
                  placeholder="Pump 1"
                  className={inputCls(!!errors.pump_name)}
                />
              </Field>
            </div>
            <Field label="Status" error={errors.status?.message}>
              <select
                {...register('status')}
                className={inputCls(!!errors.status) + ' cursor-pointer'}
              >
                <option value="ACTIVE"   className="bg-[#18181C]">Active</option>
                <option value="INACTIVE" className="bg-[#18181C]">Inactive</option>
              </select>
            </Field>

            {/* Nozzle builder */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Nozzles
                </p>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      nozzle_code: '',
                      nozzle_name: '',
                      fuel_product_id: '',
                      meter_capacity: 99999.999,
                    })
                  }
                  className="flex items-center gap-1 text-xs text-[#E85D04]/70 hover:text-[#E85D04] transition-colors"
                >
                  <Plus size={11} /> Add Nozzle Row
                </button>
              </div>

              {(errors.nozzles as { message?: string } | undefined)?.message && (
                <p className="mb-2 text-xs text-rose-400">
                  {(errors.nozzles as { message?: string }).message}
                </p>
              )}

              <div className="flex flex-col gap-3">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="rounded-lg border border-white/8 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="number text-[10px] text-white/30">
                        Nozzle {idx + 1}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="rounded p-0.5 text-white/20 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Code"
                        error={errors.nozzles?.[idx]?.nozzle_code?.message}
                      >
                        <input
                          {...register(`nozzles.${idx}.nozzle_code`)}
                          placeholder="N-01"
                          className={
                            inputCls(!!errors.nozzles?.[idx]?.nozzle_code) + ' number'
                          }
                        />
                      </Field>
                      <Field
                        label="Name"
                        error={errors.nozzles?.[idx]?.nozzle_name?.message}
                      >
                        <input
                          {...register(`nozzles.${idx}.nozzle_name`)}
                          placeholder="Nozzle 1"
                          className={inputCls(!!errors.nozzles?.[idx]?.nozzle_name)}
                        />
                      </Field>
                      <Field
                        label="Fuel Product"
                        error={errors.nozzles?.[idx]?.fuel_product_id?.message}
                      >
                        <select
                          {...register(`nozzles.${idx}.fuel_product_id`)}
                          className={
                            inputCls(!!errors.nozzles?.[idx]?.fuel_product_id) +
                            ' cursor-pointer'
                          }
                        >
                          <option value="" className="bg-[#18181C]">Select…</option>
                          {fuelProducts.map((p) => (
                            <option key={p.id} value={p.id} className="bg-[#18181C]">
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label="Meter Capacity"
                        error={errors.nozzles?.[idx]?.meter_capacity?.message}
                      >
                        <input
                          {...register(`nozzles.${idx}.meter_capacity`, {
                            setValueAs: (v) =>
                              v === '' || v == null ? undefined : parseFloat(v),
                          })}
                          type="number"
                          step="0.001"
                          className={
                            inputCls(!!errors.nozzles?.[idx]?.meter_capacity) + ' number'
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-[#E85D04] text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60"
            >
              {isSubmitting ? 'Creating…' : 'Create Pump'}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Edit Pump Modal ──────────────────────────────────────────────────────────

const editPumpSchema = z.object({
  pump_code: z.string().min(1, 'Required'),
  pump_name: z.string().min(1, 'Required'),
  status:    z.enum(['ACTIVE', 'INACTIVE']),
})
type EditPumpForm = z.infer<typeof editPumpSchema>

function EditPumpModal({
  pump,
  open,
  onOpenChange,
}: {
  pump: Pump
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditPumpForm>({
    resolver: zodResolver(editPumpSchema),
    defaultValues: {
      pump_code: pump.pump_code,
      pump_name: pump.pump_name,
      status:    pump.status,
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await pumpsApi.update(pump.id, data)
      await queryClient.invalidateQueries({ queryKey: ['pumps'] })
      toast.success('Pump updated')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update pump')
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
        <h3 className="mb-4 font-syne text-base font-semibold text-white">Edit Pump</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Pump Code" error={errors.pump_code?.message}>
            <input
              {...register('pump_code')}
              className={inputCls(!!errors.pump_code) + ' number uppercase'}
            />
          </Field>
          <Field label="Pump Name" error={errors.pump_name?.message}>
            <input
              {...register('pump_name')}
              className={inputCls(!!errors.pump_name)}
            />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <select
              {...register('status')}
              className={inputCls(!!errors.status) + ' cursor-pointer'}
            >
              <option value="ACTIVE"   className="bg-[#18181C]">Active</option>
              <option value="INACTIVE" className="bg-[#18181C]">Inactive</option>
            </select>
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
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Nozzle Modal ────────────────────────────────────────────────────────

const editNozzleSchema = z.object({
  nozzle_code:     z.string().min(1, 'Required'),
  nozzle_name:     z.string().min(1, 'Required'),
  fuel_product_id: z.string().min(1, 'Required'),
  meter_capacity:  z.number().positive('> 0'),
  status:          z.enum(['ACTIVE', 'INACTIVE']),
})
type EditNozzleForm = z.infer<typeof editNozzleSchema>

function EditNozzleModal({
  nozzle,
  open,
  onOpenChange,
  fuelProducts,
}: {
  nozzle: Nozzle
  open: boolean
  onOpenChange: (v: boolean) => void
  fuelProducts: Product[]
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditNozzleForm>({
    resolver: zodResolver(editNozzleSchema),
    defaultValues: {
      nozzle_code:     nozzle.nozzle_code,
      nozzle_name:     nozzle.nozzle_name,
      fuel_product_id: nozzle.fuel_product_id,
      meter_capacity:  nozzle.meter_capacity,
      status:          nozzle.status,
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await pumpsApi.updateNozzle(nozzle.id, data)
      await queryClient.invalidateQueries({ queryKey: ['pumps'] })
      toast.success('Nozzle updated')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update nozzle')
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
        <h3 className="mb-4 font-syne text-base font-semibold text-white">Edit Nozzle</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" error={errors.nozzle_code?.message}>
              <input
                {...register('nozzle_code')}
                className={inputCls(!!errors.nozzle_code) + ' number'}
              />
            </Field>
            <Field label="Name" error={errors.nozzle_name?.message}>
              <input
                {...register('nozzle_name')}
                className={inputCls(!!errors.nozzle_name)}
              />
            </Field>
          </div>
          <Field label="Fuel Product" error={errors.fuel_product_id?.message}>
            <select
              {...register('fuel_product_id')}
              className={inputCls(!!errors.fuel_product_id) + ' cursor-pointer'}
            >
              {fuelProducts.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#18181C]">
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Meter Capacity" error={errors.meter_capacity?.message}>
            <input
              {...register('meter_capacity', {
                setValueAs: (v) =>
                  v === '' || v == null ? undefined : parseFloat(v),
              })}
              type="number"
              step="0.001"
              className={inputCls(!!errors.meter_capacity) + ' number'}
            />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <select
              {...register('status')}
              className={inputCls(!!errors.status) + ' cursor-pointer'}
            >
              <option value="ACTIVE"   className="bg-[#18181C]">Active</option>
              <option value="INACTIVE" className="bg-[#18181C]">Inactive</option>
            </select>
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
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Add Nozzle Modal ─────────────────────────────────────────────────────────

const addNozzleSchema = z.object({
  nozzle_code:     z.string().min(1, 'Required'),
  nozzle_name:     z.string().min(1, 'Required'),
  fuel_product_id: z.string().min(1, 'Required'),
  meter_capacity:  z.number().positive('> 0'),
})
type AddNozzleForm = z.infer<typeof addNozzleSchema>

function AddNozzleModal({
  pumpId,
  open,
  onOpenChange,
  fuelProducts,
}: {
  pumpId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  fuelProducts: Product[]
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddNozzleForm>({
    resolver: zodResolver(addNozzleSchema),
    defaultValues: { meter_capacity: 99999.999 },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await pumpsApi.createNozzle({ pump_id: pumpId, ...data })
      await queryClient.invalidateQueries({ queryKey: ['pumps'] })
      toast.success('Nozzle added')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to add nozzle')
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
        <h3 className="mb-4 font-syne text-base font-semibold text-white">Add Nozzle</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" error={errors.nozzle_code?.message}>
              <input
                {...register('nozzle_code')}
                placeholder="N-01"
                className={inputCls(!!errors.nozzle_code) + ' number'}
              />
            </Field>
            <Field label="Name" error={errors.nozzle_name?.message}>
              <input
                {...register('nozzle_name')}
                placeholder="Nozzle 1"
                className={inputCls(!!errors.nozzle_name)}
              />
            </Field>
          </div>
          <Field label="Fuel Product" error={errors.fuel_product_id?.message}>
            <select
              {...register('fuel_product_id')}
              className={inputCls(!!errors.fuel_product_id) + ' cursor-pointer'}
            >
              <option value="" className="bg-[#18181C]">Select…</option>
              {fuelProducts.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#18181C]">
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Meter Capacity" error={errors.meter_capacity?.message}>
            <input
              {...register('meter_capacity', {
                setValueAs: (v) =>
                  v === '' || v == null ? undefined : parseFloat(v),
              })}
              type="number"
              step="0.001"
              className={inputCls(!!errors.meter_capacity) + ' number'}
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
              {isSubmitting ? 'Adding…' : 'Add Nozzle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Nozzle Card ──────────────────────────────────────────────────────────────

function NozzleCard({
  nozzle,
  fuelProducts,
}: {
  nozzle: Nozzle
  fuelProducts: Product[]
}) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-2">
        <Fuel size={12} className="shrink-0 text-amber-400/60" />
        <div>
          <p className="number text-[10px] text-white/30">{nozzle.nozzle_code}</p>
          <p className="text-xs font-medium text-white/70">{nozzle.nozzle_name}</p>
          {nozzle.fuel_product && (
            <p className="text-[10px] text-white/30">{nozzle.fuel_product.name}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="number text-[10px] text-white/25">
          {nozzle.meter_capacity != null
            ? Number(nozzle.meter_capacity).toLocaleString('en-LK', { maximumFractionDigits: 0 })
            : '—'}{' '}
          L
        </span>
        <StatusBadge status={nozzle.status} />
        <button
          onClick={() => setEditOpen(true)}
          className="rounded p-1 text-white/20 hover:bg-white/5 hover:text-white/60"
        >
          <Pencil size={11} />
        </button>
      </div>

      <EditNozzleModal
        nozzle={nozzle}
        open={editOpen}
        onOpenChange={setEditOpen}
        fuelProducts={fuelProducts}
      />
    </div>
  )
}

// ─── Pump Card ────────────────────────────────────────────────────────────────

function PumpCard({
  pump,
  fuelProducts,
}: {
  pump: Pump
  fuelProducts: Product[]
}) {
  const [editPumpOpen, setEditPumpOpen]   = useState(false)
  const [addNozzleOpen, setAddNozzleOpen] = useState(false)

  return (
    <div className="flex flex-col rounded-xl border border-white/8 bg-[#18181C]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-syne text-sm font-semibold text-white">{pump.pump_name}</p>
            <span className="number rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-white/40">
              {pump.pump_code}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={pump.status} />
          <button
            onClick={() => setEditPumpOpen(true)}
            className="rounded p-1.5 text-white/30 hover:bg-white/5 hover:text-white/70"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Nozzles */}
      <div className="flex flex-col gap-2 p-3">
        {(pump.nozzles ?? []).length === 0 ? (
          <p className="text-center text-[11px] text-white/20">No nozzles</p>
        ) : (
          (pump.nozzles ?? []).map((nozzle) => (
            <NozzleCard key={nozzle.id} nozzle={nozzle} fuelProducts={fuelProducts} />
          ))
        )}
        <button
          onClick={() => setAddNozzleOpen(true)}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 py-1.5 text-xs text-white/25 transition-colors hover:border-[#E85D04]/30 hover:text-[#E85D04]/60"
        >
          <Plus size={11} /> Add Nozzle
        </button>
      </div>

      <EditPumpModal pump={pump} open={editPumpOpen} onOpenChange={setEditPumpOpen} />
      <AddNozzleModal
        pumpId={pump.id}
        open={addNozzleOpen}
        onOpenChange={setAddNozzleOpen}
        fuelProducts={fuelProducts}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PumpsPage() {
  const [addPumpOpen, setAddPumpOpen] = useState(false)

  const pumpsQuery = useQuery({
    queryKey: ['pumps', { limit: 100 }],
    queryFn: () => pumpsApi.list({ limit: 100 }).then((r) => r.data),
  })
  const pumps: Pump[] = pumpsQuery.data?.data ?? []

  const productsQuery = useQuery({
    queryKey: ['products', { limit: 100 }],
    queryFn: () => inventoryApi.listProducts({ limit: 100 }).then((r) => r.data),
  })
  const fuelProducts: Product[] = (productsQuery.data?.data ?? []).filter(
    (p) => p.category === 'FUEL',
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Pumps & Nozzles"
        description="Pump and nozzle configuration for the station"
        actions={
          <button
            onClick={() => setAddPumpOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06]"
          >
            <Plus size={14} /> New Pump
          </button>
        }
      />

      {pumpsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : pumps.length === 0 ? (
        <p className="text-sm text-white/30">No pumps configured yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pumps.map((pump) => (
            <PumpCard key={pump.id} pump={pump} fuelProducts={fuelProducts} />
          ))}
        </div>
      )}

      <AddPumpSheet
        open={addPumpOpen}
        onOpenChange={setAddPumpOpen}
        fuelProducts={fuelProducts}
      />
    </div>
  )
}
