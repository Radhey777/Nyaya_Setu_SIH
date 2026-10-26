import { apiClient } from './client'
import type { Bureau } from '../types'

/** GET /bureaus/ — fetches up to 100 bureaus (full list) */
export async function listBureaus(): Promise<Bureau[]> {
  const res = await apiClient.get<Bureau[]>('/bureaus/', { params: { limit: 100 } })
  return res.data
}

/** GET /bureaus/:id */
export async function getBureau(id: number): Promise<Bureau> {
  const res = await apiClient.get<Bureau>(`/bureaus/${id}`)
  return res.data
}
