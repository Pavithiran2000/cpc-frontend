'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'

import { shiftsApi } from '@/lib/api/shifts'
import { staffApi } from '@/lib/api/staff'
import type { AttendanceRecord, ShiftSession } from '@/lib/types'
import { formatDateTime, formatDate } from '@/lib/utils'
import { usePagination } from '@/lib/hooks/usePagination'

import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const { page, limit, sortBy, sortOrder, setPage, setLimit, setSort } = usePagination()
  const [selectedSession, setSelectedSession] = useState('')
  const [clockStaffId,    setClockStaffId]    = useState('')

  // Recent sessions for the dropdown
  const sessionsQuery = useQuery({
    queryKey: ['shift-sessions-list', { limit: 30 }],
    queryFn:  () => shiftsApi.listSessions({ limit: 30 }).then((r) => r.data),
  })
  const sessions: ShiftSession[] = sessionsQuery.data?.data ?? []

  // Staff for clock-in selector
  const staffQuery = useQuery({
    queryKey: ['staff', { status: 'ACTIVE', limit: 100 }],
    queryFn:  () => staffApi.list({ status: 'ACTIVE', limit: 100 }).then((r) => r.data),
  })
  const staff = staffQuery.data?.data ?? []

  // Attendance records
  const filters = useMemo(
    () => ({
      page,
      limit,
      shift_session_id: selectedSession || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    }),
    [page, limit, selectedSession, sortBy, sortOrder],
  )

  const attendanceQuery = useQuery({
    queryKey: ['attendance', filters],
    queryFn:  () => shiftsApi.listAttendance(filters).then((r) => r.data),
  })
  const records: AttendanceRecord[] = attendanceQuery.data?.data ?? []

  const clockInMutation = useMutation({
    mutationFn: (staff_id: string) =>
      shiftsApi.clockIn({ shift_session_id: selectedSession, staff_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      setClockStaffId('')
      toast.success('Clocked in')
    },
    onError: () => toast.error('Clock-in failed'),
  })

  const clockOutMutation = useMutation({
    mutationFn: (staff_id: string) =>
      shiftsApi.clockOut({ shift_session_id: selectedSession, staff_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success('Clocked out')
    },
    onError: () => toast.error('Clock-out failed'),
  })

  const columns = useMemo<ColumnDef<AttendanceRecord>[]>(
    () => [
      {
        id: 'staff',
        header: 'Staff',
        cell: ({ row }) => (
          <p className="font-medium text-foreground">
            {row.original.staff?.name ?? row.original.staff_id}
          </p>
        ),
      },
      {
        id: 'clock_in',
        header: 'Clock In',
        meta: { sortKey: 'clock_in_at', defaultSortDir: 'DESC' as const },
        cell: ({ row }) =>
          row.original.clock_in_at ? (
            <span className="number text-xs text-emerald-400">
              {formatDateTime(row.original.clock_in_at)}
            </span>
          ) : (
            <span className="text-xs text-foreground/25">—</span>
          ),
      },
      {
        id: 'clock_out',
        header: 'Clock Out',
        meta: { sortKey: 'clock_out_at', defaultSortDir: 'DESC' as const },
        cell: ({ row }) =>
          row.original.clock_out_at ? (
            <span className="number text-xs text-foreground/60">
              {formatDateTime(row.original.clock_out_at)}
            </span>
          ) : (
            <span className="text-xs text-foreground/25">—</span>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {!row.original.clock_in_at && selectedSession && (
              <button
                onClick={() => clockInMutation.mutate(row.original.staff_id)}
                disabled={clockInMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground/30 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-40"
              >
                <UserCheck size={12} /> In
              </button>
            )}
            {row.original.clock_in_at && !row.original.clock_out_at && selectedSession && (
              <button
                onClick={() => clockOutMutation.mutate(row.original.staff_id)}
                disabled={clockOutMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground/30 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
              >
                <UserX size={12} /> Out
              </button>
            )}
          </div>
        ),
      },
    ],
    [clockInMutation, clockOutMutation, selectedSession],
  )

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Attendance"
        description="Clock in and out per shift session"
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-foreground/35">
            Shift Session
          </label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="number rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground outline-none focus:border-[#E85D04]/50"
          >
            <option value="" className="bg-card">All sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-card">
                {formatDate(s.business_date)} —{' '}
                {s.shift_template?.shift_name ?? s.shift_template_id} ({s.status})
              </option>
            ))}
          </select>
        </div>

        {selectedSession && (
          <div className="flex items-center gap-2">
            <select
              value={clockStaffId}
              onChange={(e) => setClockStaffId(e.target.value)}
              className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground outline-none focus:border-[#E85D04]/50"
            >
              <option value="" className="bg-card">Select staff…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id} className="bg-card">
                  {s.name}
                </option>
              ))}
            </select>
            <button
              disabled={!clockStaffId || clockInMutation.isPending}
              onClick={() => clockStaffId && clockInMutation.mutate(clockStaffId)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              <UserCheck size={12} /> Clock In
            </button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={records}
        total={attendanceQuery.data?.meta.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={attendanceQuery.isLoading}
        emptyMessage="No attendance records"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSort}
      />
    </div>
  )
}
