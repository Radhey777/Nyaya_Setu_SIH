import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Select, Card, Pagination, TableSkeleton, ErrorState, EmptyState } from '../../components/ui'
import { listAudit } from '../../api/audit'

const LIMIT = 50

const ACTION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'case_created', label: 'Case Created' },
  { value: 'status_changed', label: 'Status Changed' },
  { value: 'case_assigned', label: 'Case Assigned' },
  { value: 'coordination_created', label: 'Coordination Created' },
  { value: 'coordination_closed', label: 'Coordination Closed' },
  { value: 'import_committed', label: 'Import Committed' },
]

export default function AuditLogPage() {
  const [skip, setSkip] = useState(0)
  const [action, setAction] = useState('all')

  const auditQ = useQuery({
    queryKey: ['audit', skip, action],
    queryFn: () =>
      listAudit({
        skip,
        limit: LIMIT,
        ...(action !== 'all' ? { action } : {}),
      }),
  })

  const items = auditQ.data?.items ?? []
  const total = auditQ.data?.total ?? 0

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Log" />
      <DataNote />

      {/* Filter row */}
      <div className="flex items-end gap-4">
        <div className="w-64">
          <Select
            label="Action"
            options={ACTION_OPTIONS}
            value={action}
            onChange={e => {
              setAction(e.target.value)
              setSkip(0)
            }}
          />
        </div>
      </div>

      <Card>
        {auditQ.isLoading ? (
          <TableSkeleton cols={6} />
        ) : auditQ.isError ? (
          <ErrorState onRetry={() => auditQ.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title="No audit events" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Resource Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Resource ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {format(new Date(e.created_at), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {e.user?.full_name ?? (e.user_id ? `User #${e.user_id}` : '—')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="font-mono text-xs">{e.action}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{e.resource_type}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{e.resource_id ?? '—'}</td>
                    <td className="px-4 py-2 max-w-xs truncate">
                      {e.detail ? JSON.stringify(e.detail) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination total={total} skip={skip} limit={LIMIT} onPageChange={setSkip} />
    </div>
  )
}
