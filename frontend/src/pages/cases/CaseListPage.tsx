import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Briefcase, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { PageHeader } from '../../components/layout/PageHeader'
import {
  DataNote,
  SearchBar,
  Card,
  Pagination,
  TableSkeleton,
  ErrorState,
  EmptyState,
  Select,
  Button,
  StatusBadge,
  PriorityBadge,
} from '../../components/ui'
import { listCases } from '../../api/cases'
import { CaseStatus, CasePriority } from '../../types'

const LIMIT = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...Object.values(CaseStatus).map(s => ({
    value: s,
    label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  })),
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  ...Object.values(CasePriority).map(p => ({
    value: p,
    label: p.charAt(0).toUpperCase() + p.slice(1),
  })),
]

export default function CaseListPage() {
  const [search, setSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cases', skip, search, status, priority],
    queryFn: () =>
      listCases({
        skip,
        limit: LIMIT,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
      }),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const onSearch = (q: string) => {
    setSearch(q)
    setSkip(0)
  }

  return (
    <>
      <PageHeader
        title="Cases"
        actions={
          <Link to="/cases/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Case
            </Button>
          </Link>
        }
      />
      <DataNote />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={search}
            onChange={onSearch}
            placeholder="Search cases…"
          />
        </div>
        <div className="w-44">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={e => { setStatus(e.target.value); setSkip(0) }}
          />
        </div>
        <div className="w-40">
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={e => { setPriority(e.target.value); setSkip(0) }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Card>
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : isError ? (
            <ErrorState message="Failed to load cases" onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <EmptyState icon={Briefcase} title="No cases found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Case #</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bureau</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="font-mono text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {c.case_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate text-gray-900">{c.title}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                        {c.bureau?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {format(new Date(c.received_date), 'dd MMM yyyy')}
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
