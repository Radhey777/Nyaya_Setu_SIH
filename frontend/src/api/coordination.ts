import { apiClient } from './client'
import type { CoordinationItem, PaginatedResponse } from '../types'

export interface ListCoordinationParams {
  skip?: number
  limit?: number
  status?: string
}

export interface DecisionPayload {
  decision: string
  rationale: string
}

export interface ClosurePayload {
  closure_notes: string
  is_exception?: boolean
}

/** GET /coordination/ */
export async function listCoordination(
  params?: ListCoordinationParams
): Promise<PaginatedResponse<CoordinationItem>> {
  const res = await apiClient.get<PaginatedResponse<CoordinationItem>>('/coordination/', {
    params,
  })
  return res.data
}

/** GET /coordination/:id */
export async function getCoordination(id: number): Promise<CoordinationItem> {
  const res = await apiClient.get<CoordinationItem>(`/coordination/${id}`)
  return res.data
}

/** POST /coordination/ */
export async function createCoordination(
  data: Record<string, unknown>
): Promise<CoordinationItem> {
  const res = await apiClient.post<CoordinationItem>('/coordination/', data)
  return res.data
}

/** POST /coordination/:id/participants */
export async function addParticipant(
  id: number,
  data: Record<string, unknown>
): Promise<CoordinationItem> {
  const res = await apiClient.post<CoordinationItem>(
    `/coordination/${id}/participants`,
    data
  )
  return res.data
}

/** POST /coordination/:id/acknowledge */
export async function acknowledge(id: number): Promise<CoordinationItem> {
  const res = await apiClient.post<CoordinationItem>(`/coordination/${id}/acknowledge`)
  return res.data
}

/** POST /coordination/:id/decision */
export async function recordDecision(
  id: number,
  data: DecisionPayload
): Promise<CoordinationItem> {
  const res = await apiClient.post<CoordinationItem>(`/coordination/${id}/decision`, data)
  return res.data
}

/** POST /coordination/:id/tasks */
export async function addTask(
  id: number,
  data: Record<string, unknown>
): Promise<CoordinationItem> {
  const res = await apiClient.post<CoordinationItem>(`/coordination/${id}/tasks`, data)
  return res.data
}

/** POST /coordination/:coordId/tasks/:taskId/complete */
export async function completeTask(
  coordId: number,
  taskId: number,
  data: { completion_notes?: string }
): Promise<CoordinationItem> {
  const res = await apiClient.post<CoordinationItem>(
    `/coordination/${coordId}/tasks/${taskId}/complete`,
    data
  )
  return res.data
}

/** POST /coordination/:id/close */
export async function closeCoordination(
  id: number,
  data: ClosurePayload
): Promise<CoordinationItem> {
  const res = await apiClient.post<CoordinationItem>(`/coordination/${id}/close`, data)
  return res.data
}
