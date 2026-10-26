import { apiClient } from './client'

export interface SummaryReport {
  generated_at: string
  total_cases: number
  total_institutions: number
  cases_by_status: Record<string, number>
  cases_by_bureau: Record<string, number>
  coordination_summary: Record<string, number>
}

export interface ExportCasesParams {
  status?: string
  bureau_id?: number
  institution_id?: number
}

/** GET /reports/cases/csv — returns a Blob */
export async function exportCasesCSV(params?: ExportCasesParams): Promise<Blob> {
  const res = await apiClient.get<Blob>('/reports/cases/csv', {
    params,
    responseType: 'blob',
  })
  return res.data
}

/** GET /reports/coordination/csv — returns a Blob */
export async function exportCoordinationCSV(): Promise<Blob> {
  const res = await apiClient.get<Blob>('/reports/coordination/csv', {
    responseType: 'blob',
  })
  return res.data
}

/** GET /reports/summary */
export async function getSummaryReport(): Promise<SummaryReport> {
  const res = await apiClient.get<SummaryReport>('/reports/summary')
  return res.data
}
