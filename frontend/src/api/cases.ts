import { apiClient } from './client'
import type { Case, CaseAction, PaginatedResponse } from '../types'

export interface ListCasesParams {
  skip?: number
  limit?: number
  status?: string
  bureau_id?: number
  institution_id?: number
  priority?: string
  category?: string
  overdue?: boolean
  search?: string
}

export interface ChangeStatusPayload {
  new_status: string
  reason?: string
}

export interface AssignCasePayload {
  officer_id: number
  notes?: string
}

export interface AddActionPayload {
  action_type: string
  description: string
}

export interface TransferPayload {
  to_bureau_id: number
  reason: string
}

/** GET /cases/ */
export async function listCases(params?: ListCasesParams): Promise<PaginatedResponse<Case>> {
  const res = await apiClient.get<PaginatedResponse<Case>>('/cases/', { params })
  return res.data
}

/** GET /cases/:id */
export async function getCase(id: number): Promise<Case> {
  const res = await apiClient.get<Case>(`/cases/${id}`)
  return res.data
}

/** POST /cases/ */
export async function createCase(data: Record<string, unknown>): Promise<Case> {
  const res = await apiClient.post<Case>('/cases/', data)
  return res.data
}

/** PUT /cases/:id */
export async function updateCase(id: number, data: Record<string, unknown>): Promise<Case> {
  const res = await apiClient.put<Case>(`/cases/${id}`, data)
  return res.data
}

/** POST /cases/:id/status */
export async function changeStatus(id: number, data: ChangeStatusPayload): Promise<Case> {
  const res = await apiClient.post<Case>(`/cases/${id}/status`, data)
  return res.data
}

/** POST /cases/:id/assign */
export async function assignCase(id: number, data: AssignCasePayload): Promise<Case> {
  const res = await apiClient.post<Case>(`/cases/${id}/assign`, data)
  return res.data
}

/** POST /cases/:id/actions */
export async function addAction(id: number, data: AddActionPayload): Promise<CaseAction> {
  const res = await apiClient.post<CaseAction>(`/cases/${id}/actions`, data)
  return res.data
}

/** GET /cases/:id/timeline */
export async function getTimeline(id: number): Promise<CaseAction[]> {
  const res = await apiClient.get<CaseAction[]>(`/cases/${id}/timeline`)
  return res.data
}

/** POST /cases/:id/transfer */
export async function requestTransfer(id: number, data: TransferPayload): Promise<Case> {
  const res = await apiClient.post<Case>(`/cases/${id}/transfer`, data)
  return res.data
}
