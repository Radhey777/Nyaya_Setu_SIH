import { apiClient } from './client'
import type { Institution, PaginatedResponse } from '../types'

export interface ListInstitutionsParams {
  skip?: number
  limit?: number
  search?: string
  state?: string
  institution_type?: string
  region?: string
}

/** GET /institutions/ */
export async function listInstitutions(
  params?: ListInstitutionsParams
): Promise<PaginatedResponse<Institution>> {
  const res = await apiClient.get<PaginatedResponse<Institution>>('/institutions/', { params })
  return res.data
}

/** GET /institutions/:id */
export async function getInstitution(id: number): Promise<Institution> {
  const res = await apiClient.get<Institution>(`/institutions/${id}`)
  return res.data
}

/** POST /institutions/ */
export async function createInstitution(
  data: Record<string, unknown>
): Promise<Institution> {
  const res = await apiClient.post<Institution>('/institutions/', data)
  return res.data
}
