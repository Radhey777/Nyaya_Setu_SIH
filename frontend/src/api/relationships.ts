import { apiClient } from './client'
import type { CaseRelationship, PaginatedResponse } from '../types'

export interface ListRelationshipsParams {
  skip?: number
  limit?: number
  review_status?: string
  relationship_type?: string
  case_id?: number
}

export interface ReviewPayload {
  decision: string
  rationale?: string
  corrected_type?: string
}

/** GET /relationships/ */
export async function listRelationships(
  params?: ListRelationshipsParams
): Promise<PaginatedResponse<CaseRelationship>> {
  const res = await apiClient.get<PaginatedResponse<CaseRelationship>>('/relationships/', {
    params,
  })
  return res.data
}

/** GET /relationships/inbox */
export async function getRelationshipInbox(
  params?: { skip?: number; limit?: number }
): Promise<PaginatedResponse<CaseRelationship>> {
  const res = await apiClient.get<PaginatedResponse<CaseRelationship>>(
    '/relationships/inbox',
    { params }
  )
  return res.data
}

/** GET /relationships/:id */
export async function getRelationship(id: number): Promise<CaseRelationship> {
  const res = await apiClient.get<CaseRelationship>(`/relationships/${id}`)
  return res.data
}

/** POST /relationships/:id/review */
export async function reviewRelationship(
  id: number,
  data: ReviewPayload
): Promise<CaseRelationship> {
  const res = await apiClient.post<CaseRelationship>(`/relationships/${id}/review`, data)
  return res.data
}
