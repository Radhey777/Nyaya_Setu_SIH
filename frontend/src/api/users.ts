import { apiClient } from './client'
import type { User, PaginatedResponse } from '../types'

export interface ListUsersParams {
  skip?: number
  limit?: number
  role?: string
  account_status?: string
}

/** GET /users/ */
export async function listUsers(
  params?: ListUsersParams
): Promise<PaginatedResponse<User>> {
  const res = await apiClient.get<PaginatedResponse<User>>('/users/', { params })
  return res.data
}

/** GET /users/:id */
export async function getUser(id: number): Promise<User> {
  const res = await apiClient.get<User>(`/users/${id}`)
  return res.data
}

/** PUT /users/:id */
export async function updateUser(
  id: number,
  data: Record<string, unknown>
): Promise<User> {
  const res = await apiClient.put<User>(`/users/${id}`, data)
  return res.data
}

/** POST /users/:id/approve */
export async function approveUser(id: number): Promise<User> {
  const res = await apiClient.post<User>(`/users/${id}/approve`)
  return res.data
}

/** POST /users/:id/reject */
export async function rejectUser(id: number): Promise<User> {
  const res = await apiClient.post<User>(`/users/${id}/reject`)
  return res.data
}

/** POST /users/:id/suspend */
export async function suspendUser(id: number): Promise<User> {
  const res = await apiClient.post<User>(`/users/${id}/suspend`)
  return res.data
}
