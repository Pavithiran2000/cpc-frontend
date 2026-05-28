'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send } from 'lucide-react'
import { toast } from 'sonner'

import { reportsApi } from '@/lib/api/reports'
import { formatDate, cn } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface CpcStockReport {
  id: string
  report_date: string
  report_type?: string
  status: string
  submitted_to?: string
  submission_date?: string
  created_at: string
}

function defaultFrom() {
  const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10)
}

export default function CpcStockPage() {
  const queryClient = useQueryClient()
  const { page, limit, setPage, setLimit } = usePagination()
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10))
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitTarget, setSubmitTarget] = useState<CpcStockReport | null>(null)
  const [submitTo, setSubmitTo] = useState('')

  const filters = useMemo(() => ({ page, limit, date_from: dateFrom, date_to: dateTo }), [page, limit, dateFrom, dateTo])

  const query = useQuery({
    queryKey: ['cpc-stock', filters],
    queryFn:  () => reportsApi.cpcStock(filters).then((r) => r.data as { data: CpcStockReport[]; meta: { total: number } }),
  })

  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generateCpcStock({ report_date: reportDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpc-stock'] })
      toast.success('CPC report generated')
    },
    onError: () => toast.error('Failed to generate report'),
  })

  const submitMutation = useMutation({
    mutationFn: (id: string) =>
      reportsApi.submitCpcStock(id, { submitted_to: submitTo || undefined, submission_date: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpc-stock'] })
      setSubmitTarget(null)
      setSubmitTo('')
      toast.success('Report submitted to CPC')
    },
    onError: () => toast.error('Failed to submit report'),
  })

  const columns = useMemo<ColumnDef<CpcStockReport>[]>(() => [
    {
      id: 'report_date',
      header: 'Report Date',
      cell: ({ row }) => <span className="number font-medium text-foreground">{formatDate(row.original.report_date)}</span>,
    },
    {
      id: 'report_type',
      header: 'Type',
      cell: ({ row }) => <span className="text-xs text-foreground/60">{row.original.report_type ?? 'Standard'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'submitted_to',
      header: 'Submitted To',
      cell: ({ row }) => (
        <div>
          <p className="text-xs text-foreground/60">{row.original.submitted_to ?? '—'}</p>
          {row.original.submission_date && (
            <p className="number text-[10px] text-foreground/35">{formatDate(row.original.submission_date)}</p>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.status !== 'SUBMITTED' ? (
        <div className="flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setSubmitTarget(row.original) }}
            className="flex items-center gap-1 rounded p-1.5 text-xs text-foreground/30 hover:bg-sky-500/10 hover:text-sky-400">
            <Send size={12} /> Submit
          </button>
        </div>
      ) : null,
    },
  ], [])

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader title="CPC Stock Report" description="CPC compliance stock reports" />

      {/* Generate + date range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">Report Date</label>
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
            className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground/70 outline-none focus:border-[#E85D04]/60" />
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[#E85D04] px-3 py-2 text-sm font-semibold text-white hover:bg-[#F48C06] disabled:opacity-60">
          <Plus size={14} />
          {generateMutation.isPending ? 'Generating…' : 'Generate Report'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="number rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/60 outline-none focus:border-[#E85D04]/50" />
        <span className="text-foreground/30">—</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="number rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/60 outline-none focus:border-[#E85D04]/50" />
      </div>

      <DataTable columns={columns} data={query.data?.data ?? []} total={query.data?.meta.total ?? 0}
        page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit}
        isLoading={query.isLoading} emptyMessage="No CPC stock reports generated" />

      {/* Submit dialog */}
      {submitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-syne text-base font-semibold text-foreground">Submit CPC Report</h3>
            <p className="mb-4 text-sm text-foreground/60">
              Submitting report for <span className="number font-medium text-foreground">{formatDate(submitTarget.report_date)}</span>
            </p>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-foreground/40">Submitted To</label>
              <input type="text" value={submitTo} onChange={(e) => setSubmitTo(e.target.value)}
                placeholder="CPC Regional Office"
                className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground outline-none focus:border-[#E85D04]/60" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSubmitTarget(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm text-foreground/60 hover:bg-muted/50">
                Cancel
              </button>
              <button onClick={() => submitMutation.mutate(submitTarget.id)} disabled={submitMutation.isPending}
                className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
                {submitMutation.isPending ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
