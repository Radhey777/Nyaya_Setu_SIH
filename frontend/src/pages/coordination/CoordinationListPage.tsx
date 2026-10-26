import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { GitBranch, Plus } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import {
  DataNote,
  Card,
  Badge,
  Button,
  Select,
  Pagination,
  TableSkeleton,
  ErrorState,
  EmptyState,
} from '../../components/ui'
import type { BadgeColor } from '../../components/ui'
import { listCoordination } from '../../api/coordination'
import { CoordinationStatus } from '../../types'

const LIMIT = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...Object.values(CoordinationStatus).map(s => ({
    value: s,
    label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  })),
]

function coordColor(status: CoordinationStatus): BadgeColor {
  switch (status) {
    case CoordinationStatus.draft: return 'gray'
    case CoordinationStatus.pending_acknowledgement: return 'yellow'
    case CoordinationStatus.active: return 'indigo'
    case CoordinationStatus.overdue: return 'red'
    case CoordinationStatus.resolved: return 'green'
    case CoordinationStatus.closed: return 'green'
    default: return 'gray'
  }
}

const fmt = (v?: string) => (v ? format(new Date(v), 'dd MMM yyyy') : '—')

export default function CoordinationListPage() {
  const [skip, setSkip] = useState(0)
  const [status, setStatus] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['coordination', skip, status],
    queryFn: () =>
      listCoordination({
        skip,
        limit: LIMIT,
        status: status || undefined,
      }),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <>
      <PageHeader
        title="Coordination"
        actions={
          <Link to="/coordination/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Coordination
            </Button>
          </Link>
        }
      />
      <DataNote />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-52">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={e => { setStatus(e.target.value); setSkip(0) }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Card>
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : isError ? (
            <ErrorState message="Failed to load coordination items" onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <EmptyState icon={GitBranch} title="No coordination items found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Participants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          to={`/coordination/${item.id}`}
                          className="font-mono text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {item.reference_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate text-gray-900">
                        {item.title}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Badge color={coordColor(item.status)}>
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                        {item.owner?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {fmt(item.action_due_date)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                        {item.participants.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Pagination total={total} skip={skip} limit={LIMIT} onPageChange={setSkip} />
    </>
  )
}
