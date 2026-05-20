import { api } from './client'
import type { EntityChangeLog } from '@/lib/types'

interface ChangeLogQuery {
  entity_type?: string
  entity_id?: string
  limit?: number
  offset?: number
}

interface AuditLogQuery {
  module?: string
  action?: string
  from?: string
  to?: string
}

export const auditApi = {
  // Uses offset-based pagination (not page/limit envelope)
  entityChangeLogs: (params?: ChangeLogQuery) =>
    api.get<{ data: EntityChangeLog[]; total: number }>(
      '/audit/entity-change-logs',
      { params },
    ),

  auditLogs: (params?: AuditLogQuery) =>
    api.get('/audit-logs', { params }),
}
