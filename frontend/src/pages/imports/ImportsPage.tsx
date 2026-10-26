import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Upload } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Card, Tabs, Badge, TableSkeleton } from '../../components/ui'
import type { TabItem } from '../../components/ui'
import {
  previewInstitutions,
  commitInstitutions,
  previewCases,
  commitCases,
  listImports,
} from '../../api/imports'
import type { ImportPreviewResult } from '../../api/imports'
import { toast } from '../../hooks/useToast'

export default function ImportsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'institutions' | 'cases'>('institutions')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const importsQ = useQuery({ queryKey: ['imports'], queryFn: listImports })

  const previewMut = useMutation({
    mutationFn: (f: File) =>
      tab === 'institutions' ? previewInstitutions(f) : previewCases(f),
    onSuccess: (r) => {
      setPreviewResult(r)
      toast.info(`${r.valid_rows} valid rows, ${r.error_rows} errors`)
    },
    onError: () => toast.error('Preview failed'),
  })

  const commitMut = useMutation({
    mutationFn: (jobId: number) =>
      tab === 'institutions' ? commitInstitutions(jobId) : commitCases(jobId),
    onSuccess: (r) => {
      toast.success(`Imported ${r.committed_rows} rows`)
      setPreviewResult(null)
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
    onError: () => toast.error('Commit failed'),
  })

  const onTabChange = (t: string) => {
    setTab(t as 'institutions' | 'cases')
    setPreviewResult(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <PageHeader title="Data Import" />
      <DataNote />

      <div className="mt-4">
        <Tabs
          tabs={[
            { id: 'institutions', label: 'Institutions' },
            { id: 'cases', label: 'Cases' },
          ] as TabItem[]}
          activeTab={tab}
          onTabChange={onTabChange}
        />
      </div>

      {/* Tab content */}
      <div className="mt-4 max-w-2xl">
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <span className="text-sm text-gray-500">
                {selectedFile?.name ?? 'No file chosen'}
              </span>
            </div>

            <Button
              onClick={() => selectedFile && previewMut.mutate(selectedFile)}
              loading={previewMut.isPending}
              disabled={!selectedFile}
            >
              <Upload className="h-4 w-4" />
              Preview
            </Button>

            {previewResult && (
              <div className="rounded-md border border-gray-200 p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{previewResult.valid_rows}</span>{' '}
                  valid rows,{' '}
                  <span className="font-semibold">{previewResult.error_rows}</span>{' '}
                  errors
                </p>

                {previewResult.errors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Row #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Message
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {previewResult.errors.map((e, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {e.row}
                            </td>
                            <td className="px-3 py-2">
                              <Badge color="red">{e.message}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-green-700">No errors detected.</p>
                )}

                <Button
                  onClick={() =>
                    previewResult && commitMut.mutate(previewResult.job_id)
                  }
                  loading={commitMut.isPending}
                  disabled={!previewResult || previewResult.valid_rows === 0}
                >
                  Commit Import
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Import History */}
      <div className="mt-4">
        <Card title="Import History">
          {importsQ.isLoading ? (
            <TableSkeleton cols={6} />
          ) : importsQ.isError ? (
            <p className="text-sm text-red-600">Failed to load import history.</p>
          ) : (importsQ.data ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No imports yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Processed
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Errors
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {(importsQ.data ?? []).map((j) => (
                    <tr key={j.id}>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {j.job_type}
                      </td>
                      <td className="px-3 py-2">
                        <Badge>{j.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {j.total_rows}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {j.processed_rows}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {j.error_rows}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {format(new Date(j.created_at), 'dd MMM yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
