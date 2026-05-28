'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, X, XCircle, Shield, ShieldCheck,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { platformApi, extractPlatformError } from '@/lib/platform-api'
import { usePlatformAuth } from '@/providers/PlatformAuthContext'
import { formatRelativeTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { PlatformAdmin, PlatformRole, PlatformAdminStatus, PaginatedResponse } from '@/lib/platform-types'

// ─── Access denied ────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
        <XCircle size={28} className="text-rose-500" />
      </div>
      <p className="font-syne text-lg font-bold text-foreground">Access Denied</p>
      <p className="text-sm text-foreground/50">This page is only available to SUPER_ADMIN users.</p>
    </div>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-syne text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-foreground/40 hover:bg-foreground/5 hover:text-foreground/60 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Action menu ──────────────────────────────────────────────────────────────

interface ActionItem {
  label: string; onClick: () => void; danger?: boolean; hidden?: boolean
}

function ActionMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const visible = items.filter((i) => !i.hidden)
  if (visible.length === 0) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="rounded p-1.5 text-foreground/40 hover:bg-foreground/8 hover:text-foreground/60 transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-border bg-card py-1 shadow-lg">
          {visible.map((item) => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); item.onClick() }}
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
                item.danger ? 'text-rose-600 hover:bg-rose-500/8' : 'text-foreground/70 hover:bg-foreground/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal content components ─────────────────────────────────────────────────

function ConfirmBody({ description, onCancel, onConfirm, loading, danger }: {
  description: string; onCancel: () => void; onConfirm: () => void; loading?: boolean; danger?: boolean
}) {
  return (
    <>
      <p className="mb-5 text-sm text-foreground/60">{description}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#E85D04] hover:bg-[#c94e03]'}`}
        >
          {loading ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </>
  )
}

// ─── Filters ──────────────────────────────────────────────────────────────────

type RoleFilter = PlatformRole | 'ALL'
type StatusFilter = PlatformAdminStatus | 'ALL'

const ROLE_OPTS: RoleFilter[] = ['ALL', 'SUPER_ADMIN', 'ADMIN', 'SUPPORT']
const STATUS_OPTS: StatusFilter[] = ['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED']
const LIMIT = 25

type SortOrder = 'ASC' | 'DESC'

function SortIcon({ columnKey, sortBy, sortOrder }: { columnKey: string; sortBy: string; sortOrder: SortOrder }) {
  if (sortBy !== columnKey) return <ArrowUpDown size={11} className="ml-1 inline text-foreground/25" />
  return sortOrder === 'ASC'
    ? <ArrowUp size={11} className="ml-1 inline text-[#E85D04]" />
    : <ArrowDown size={11} className="ml-1 inline text-[#E85D04]" />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalType = 'role' | 'status' | 'revoke' | 'delete' | 'reset' | null

export default function PlatformAdminsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { admin: me, hasRole, initialized } = usePlatformAuth()

  // Access guard
  const isSA = hasRole('SUPER_ADMIN')
  useEffect(() => {
    if (initialized && !isSA) router.replace('/platform/dashboard')
  }, [initialized, isSA, router])

  // Filters
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')

  const toggleSort = (key: string, defaultDir: SortOrder = 'DESC') => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortBy(key)
      setSortOrder(defaultDir)
    }
    setPage(1)
  }

  // Modal state
  const [target, setTarget] = useState<PlatformAdmin | null>(null)
  const [modal, setModal] = useState<ModalType>(null)
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPPORT'>('ADMIN')
  const [newStatus, setNewStatus] = useState<PlatformAdminStatus>('ACTIVE')
  const [modalErr, setModalErr] = useState('')

  const closeModal = () => { setModal(null); setTarget(null); setModalErr('') }

  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const params = {
    page, limit: LIMIT,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(debSearch && { search: debSearch }),
    ...(roleFilter !== 'ALL' && { platform_role: roleFilter }),
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
  }

  const adminsQ = useQuery<PaginatedResponse<PlatformAdmin>>({
    queryKey: ['platform', 'admins', params],
    queryFn: async () => {
      const res = await platformApi.admins.list(params as Record<string, unknown>)
      return res.data as PaginatedResponse<PlatformAdmin>
    },
    staleTime: 30_000,
    enabled: isSA,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['platform', 'admins'] })

  const makeOpts = (fn: () => Promise<unknown>, successMsg: string) => ({
    onSuccess: () => { toast.success(successMsg); closeModal(); refresh() },
    onError: (err: unknown) => { setModalErr(extractPlatformError(err)) },
  })

  const changeRoleMut = useMutation({
    mutationFn: () => platformApi.admins.changeRole(target!.id, { platform_role: newRole }),
    ...makeOpts(() => Promise.resolve(), 'Role updated'),
  })
  const changeStatusMut = useMutation({
    mutationFn: () => platformApi.admins.changeStatus(target!.id, { status: newStatus }),
    ...makeOpts(() => Promise.resolve(), 'Status updated'),
  })
  const revokeMut = useMutation({
    mutationFn: () => platformApi.admins.revokeSessions(target!.id),
    ...makeOpts(() => Promise.resolve(), 'Sessions revoked'),
  })
  const deleteMut = useMutation({
    mutationFn: () => platformApi.admins.remove(target!.id),
    ...makeOpts(() => Promise.resolve(), 'Admin removed'),
  })
  const resetPwMut = useMutation({
    mutationFn: () => platformApi.admins.resetPassword(target!.id),
    ...makeOpts(() => Promise.resolve(), 'Password reset email sent'),
  })

  const admins = adminsQ.data?.data ?? []
  const total = adminsQ.data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  if (!initialized) return null
  if (!isSA) return <AccessDenied />

  const openModal = (a: PlatformAdmin, m: ModalType) => {
    setTarget(a); setModal(m); setModalErr('')
    if (m === 'role') setNewRole(a.platformRole === 'SUPER_ADMIN' ? 'ADMIN' : (a.platformRole as 'ADMIN' | 'SUPPORT'))
    if (m === 'status') setNewStatus(a.status)
  }

  const isSelf = (a: PlatformAdmin) => a.id === me?.id

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">Platform Admins</h1>
          <p className="mt-0.5 text-sm text-foreground/50">Manage global platform administrator accounts</p>
        </div>
        <Link
          href="/platform/admins/invite"
          className="flex items-center gap-2 rounded-lg bg-[#E85D04] px-4 py-2 font-syne text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors"
        >
          <Plus size={15} /> Invite Admin
        </Link>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-foreground/40 focus:border-[#E85D04]/50 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/60">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5">
          {ROLE_OPTS.map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(1) }}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                roleFilter === r ? 'bg-[#E85D04] text-white' : 'text-foreground/50 hover:text-foreground/70'
              }`}
            >
              {r === 'ALL' ? 'All' : r}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s ? 'bg-[#E85D04] text-white' : 'text-foreground/50 hover:text-foreground/70'
              }`}
            >
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/3">
                {([
                  ['name', 'Name', 'ASC'],
                  ['email', 'Email', 'ASC'],
                  ['platform_role', 'Role', 'ASC'],
                  ['status', 'Status', 'ASC'],
                ] as [string, string, SortOrder][]).map(([key, label, dir]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key, dir)}
                    className="cursor-pointer select-none px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest transition-colors hover:text-[#E85D04]/70 text-foreground/40"
                  >
                    {label}
                    <SortIcon columnKey={key} sortBy={sortBy} sortOrder={sortOrder} />
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-foreground/40">MFA</th>
                <th
                  onClick={() => toggleSort('last_login_at', 'DESC')}
                  className="cursor-pointer select-none px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest transition-colors hover:text-[#E85D04]/70 text-foreground/40"
                >
                  Last Login
                  <SortIcon columnKey="last_login_at" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-foreground/40">Invited By</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {adminsQ.isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-border/50">
                    {[32, 48, 20, 16, 8, 24, 28, 5].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded bg-foreground/8" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <Shield size={24} className="mx-auto mb-2 text-foreground/20" />
                    <p className="text-sm text-foreground/40">No admins found</p>
                  </td>
                </tr>
              ) : (
                admins.map((a, i) => {
                  const self = isSelf(a)
                  const ext = a as PlatformAdmin
                  return (
                    <tr key={a.id} className={`border-b border-border/50 last:border-0 hover:bg-[#E85D04]/4 transition-colors ${i % 2 !== 0 ? 'bg-foreground/2' : ''} ${self ? 'bg-[#E85D04]/4' : ''}`}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link
                          href={`/platform/admins/${a.id}`}
                          className="hover:text-[#E85D04] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {a.name}
                        </Link>
                        {self && <span className="ml-1.5 text-[10px] text-foreground/40">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-foreground/60 text-xs">{a.email}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.platformRole} /></td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-center">
                        {a.twoFactorEnabled ? (
                          <ShieldCheck size={15} className="mx-auto text-emerald-500 dark:text-emerald-400" title="MFA enabled" />
                        ) : (
                          <Shield size={15} className="mx-auto text-foreground/20" title="MFA disabled" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground/40">
                          {a.lastLoginAt ? formatRelativeTime(a.lastLoginAt) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/40">
                        {ext.invitedByName ?? ext.invitedByEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          items={[
                            {
                              label: 'View Profile',
                              onClick: () => router.push(`/platform/admins/${a.id}`),
                            },
                            {
                              label: 'Change Role',
                              onClick: () => openModal(a, 'role'),
                              hidden: self,
                            },
                            {
                              label: 'Change Status',
                              onClick: () => openModal(a, 'status'),
                              hidden: self,
                            },
                            {
                              label: 'Revoke All Sessions',
                              onClick: () => openModal(a, 'revoke'),
                              hidden: self,
                            },
                            {
                              label: 'Send Password Reset',
                              onClick: () => openModal(a, 'reset'),
                            },
                            {
                              label: 'Delete Admin',
                              onClick: () => openModal(a, 'delete'),
                              danger: true,
                              hidden: self,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border bg-foreground/3 px-4 py-2.5">
          <span className="font-mono text-xs text-foreground/40">
            {total === 0 ? '0 records' : `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="min-w-[50px] text-center font-mono text-xs text-foreground/50">{page}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-0.5 rounded px-2 py-1 text-xs text-foreground/40 hover:text-foreground/60 disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Change Role modal ── */}
      <Modal open={modal === 'role'} onClose={closeModal} title="Change Role">
        <div className="space-y-4">
          <p className="text-sm text-foreground/60">
            Changing role for <strong>{target?.name}</strong> ({target?.email})
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/50">New Role</label>
            <div className="flex gap-2">
              {(['ADMIN', 'SUPPORT'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setNewRole(r)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                    newRole === r
                      ? r === 'ADMIN' ? 'border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'border-border bg-foreground/8 text-foreground/70'
                      : 'border-border text-foreground/40 hover:border-foreground/20 hover:bg-foreground/5'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {modalErr && <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{modalErr}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">Cancel</button>
            <button
              onClick={() => changeRoleMut.mutate()}
              disabled={changeRoleMut.isPending || newRole === target?.platformRole}
              className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
            >
              {changeRoleMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Change Status modal ── */}
      <Modal open={modal === 'status'} onClose={closeModal} title="Change Status">
        <div className="space-y-4">
          <p className="text-sm text-foreground/60">Update status for <strong>{target?.name}</strong></p>
          <div className="flex gap-2">
            {(['ACTIVE', 'INACTIVE', 'SUSPENDED'] as PlatformAdminStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setNewStatus(s)}
                className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  newStatus === s
                    ? s === 'ACTIVE' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : s === 'SUSPENDED' ? 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'border-border bg-foreground/8 text-foreground/70'
                    : 'border-border text-foreground/40 hover:border-foreground/20 hover:bg-foreground/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {modalErr && <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{modalErr}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors">Cancel</button>
            <button
              onClick={() => changeStatusMut.mutate()}
              disabled={changeStatusMut.isPending || newStatus === target?.status}
              className="rounded-lg bg-[#E85D04] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c94e03] transition-colors disabled:opacity-60"
            >
              {changeStatusMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Revoke Sessions modal ── */}
      <Modal open={modal === 'revoke'} onClose={closeModal} title="Revoke All Sessions">
        <ConfirmBody
          description={`This will log ${target?.name ?? 'this admin'} out from all devices immediately.`}
          onCancel={closeModal}
          onConfirm={() => revokeMut.mutate()}
          loading={revokeMut.isPending}
        />
        {modalErr && <p className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{modalErr}</p>}
      </Modal>

      {/* ── Delete modal ── */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete Admin">
        <ConfirmBody
          description={`This will deactivate ${target?.name ?? 'this admin'}'s account. This action cannot be undone.`}
          onCancel={closeModal}
          onConfirm={() => deleteMut.mutate()}
          loading={deleteMut.isPending}
          danger
        />
        {modalErr && <p className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{modalErr}</p>}
      </Modal>

      {/* ── Reset Password modal ── */}
      <Modal open={modal === 'reset'} onClose={closeModal} title="Send Password Reset">
        <ConfirmBody
          description={`Send a password reset email to ${target?.email ?? 'this admin'}?`}
          onCancel={closeModal}
          onConfirm={() => resetPwMut.mutate()}
          loading={resetPwMut.isPending}
        />
        {modalErr && <p className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">{modalErr}</p>}
      </Modal>
    </div>
  )
}
