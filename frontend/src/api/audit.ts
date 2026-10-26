import { apiClient } from './client'
import type { PaginatedResponse } from '../types'

export interface AuditEvent {
  id: number
  user_id?: number
  user?: { id: number; full_name: string; email: string }
  action: string
  resource_type: string
  resource_id?: number
  detail?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface ListAuditParams {
  skip?: number
  limit?: number
  resource_type?: string
  action?: string
  user_id?: number
}

/** GET /audit/ */
export async function listAudit(
  params?: ListAuditParams
): Promise<PaginatedResponse<AuditEvent>> {
  const res = await apiClient.get<PaginatedResponse<AuditEvent>>('/audit/', { params })
  return res.data
}
