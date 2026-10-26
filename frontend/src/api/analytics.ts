import { apiClient } from './client'
import type { DashboardStats } from '../types'

export interface AgeingBucket {
  range: string
  count: number
}

export interface TrendPoint {
  date: string
  received: number
  resolved: number
}

export interface InstitutionBreakdownItem {
  institution_id: number
  institution_name: string
  case_count: number
  overdue_count: number
}

export interface CoordinationBacklogItem {
  status: string
  count: number
  oldest_days: number
}

/** GET /analytics/dashboard */
export async function getDashboard(params?: { bureau_id?: number }): Promise<DashboardStats> {
  const res = await apiClient.get<DashboardStats>('/analytics/dashboard', { params })
  return res.data
}

/** GET /analytics/ageing */
export async function getAgeing(): Promise<AgeingBucket[]> {
  const res = await apiClient.get<AgeingBucket[]>('/analytics/ageing')
  return res.data
}

/** GET /analytics/trends */
export async function getTrends(): Promise<TrendPoint[]> {
  const res = await apiClient.get<TrendPoint[]>('/analytics/trends')
  return res.data
}

/** GET /analytics/institution-breakdown */
export async function getInstitutionBreakdown(): Promise<InstitutionBreakdownItem[]> {
  const res = await apiClient.get<InstitutionBreakdownItem[]>(
    '/analytics/institution-breakdown'
  )
  return res.data
}

/** GET /analytics/coordination-backlog */
export async function getCoordinationBacklog(): Promise<CoordinationBacklogItem[]> {
  const res = await apiClient.get<CoordinationBacklogItem[]>(
    '/analytics/coordination-backlog'
  )
  return res.data
}
