import { apiClient } from './client'
import type { Notification, PaginatedResponse } from '../types'

export interface ListNotificationsParams {
  skip?: number
  limit?: number
  unread_only?: boolean
}

export interface UnreadCountResponse {
  count: number
}

/** GET /notifications/ */
export async function listNotifications(
  params?: ListNotificationsParams
): Promise<PaginatedResponse<Notification>> {
  const res = await apiClient.get<PaginatedResponse<Notification>>('/notifications/', {
    params,
  })
  return res.data
}

/** GET /notifications/unread-count */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const res = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
  return res.data
}

/** POST /notifications/:id/read */
export async function markRead(id: number): Promise<Notification> {
  const res = await apiClient.post<Notification>(`/notifications/${id}/read`)
  return res.data
}

/** POST /notifications/read-all */
export async function markAllRead(): Promise<{ updated: number }> {
  const res = await apiClient.post<{ updated: number }>('/notifications/read-all')
  return res.data
}
