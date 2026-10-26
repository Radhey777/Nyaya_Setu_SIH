import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, SearchBar, Card, Pagination, TableSkeleton, ErrorState, EmptyState, Badge } from '../../components/ui'
import { listInstitutions } from '../../api/institutions'

const LIMIT = 20

export default function InstitutionListPage() {
  const [search, setSearch] = useState('')
  const [skip, setSkip] = useState(0)
  const [state, setState] = useState('')
  const [type, setType] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['institutions', skip, search, state, type],
    queryFn: () =>
      listInstitutions({
        skip,
        limit: LIMIT,
        search: search || undefined,
        state: state || undefined,
        institution_type: type || undefined,
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
      <PageHeader title="Institutions" />
      <DataNote />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={search}
            onChange={onSearch}
            placeholder="Search by name or identifier…"
          />
        </div>
        <div>
          <label htmlFor="state-filter" className="block text-xs font-medium text-gray-500 mb-1">
            State
          </label>
          <input
            id="state-filter"
            type="text"
            value={state}
            onChange={e => { setState(e.target.value); setSkip(0) }}
            placeholder="e.g. Maharashtra"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="type-filter" className="block text-xs font-medium text-gray-500 mb-1">
            Type
          </label>
          <input
            id="type-filter"
            type="text"
            value={type}
            onChange={e => { setType(e.target.value); setSkip(0) }}
            placeholder="e.g. Engineering"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <Card>
          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : isError ? (
            <ErrorState message="Failed to load institutions" onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <EmptyState icon={Building2} title="No institutions found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(inst => (
                    <tr key={inst.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          to={`/institutions/${inst.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          {inst.canonical_name}
                        </Link>
                        {inst.short_name && (
                          <span className="ml-2 text-xs text-gray-400">({inst.short_name})</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                        {inst.institution_type}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                        {inst.state ?? '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                        {inst.city ?? '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Badge color={inst.status === 'active' ? 'green' : 'gray'}>
                          {inst.status}
                        </Badge>
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
