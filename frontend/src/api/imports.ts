import { apiClient } from './client'

export interface ImportPreviewResult {
  job_id: number
  total_rows: number
  valid_rows: number
  error_rows: number
  errors: Array<{ row: number; message: string }>
  preview: Record<string, unknown>[]
}

export interface ImportJob {
  id: number
  job_type: string
  status: string
  total_rows: number
  processed_rows: number
  error_rows: number
  created_at: string
  completed_at?: string
  created_by?: { id: number; full_name: string }
}

export interface CommitResult {
  job_id: number
  status: string
  committed_rows: number
}

/** POST /imports/institutions/preview — multipart upload */
export async function previewInstitutions(file: File): Promise<ImportPreviewResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiClient.post<ImportPreviewResult>(
    '/imports/institutions/preview',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return res.data
}

/** POST /imports/institutions/:jobId/commit */
export async function commitInstitutions(jobId: number): Promise<CommitResult> {
  const res = await apiClient.post<CommitResult>(
    `/imports/institutions/${jobId}/commit`
  )
  return res.data
}

/** POST /imports/cases/preview — multipart upload */
export async function previewCases(file: File): Promise<ImportPreviewResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiClient.post<ImportPreviewResult>(
    '/imports/cases/preview',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return res.data
}

/** POST /imports/cases/:jobId/commit */
export async function commitCases(jobId: number): Promise<CommitResult> {
  const res = await apiClient.post<CommitResult>(`/imports/cases/${jobId}/commit`)
  return res.data
}

/** GET /imports/ */
export async function listImports(): Promise<ImportJob[]> {
  const res = await apiClient.get<ImportJob[]>('/imports/')
  return res.data
}
