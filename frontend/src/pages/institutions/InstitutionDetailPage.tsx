import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Card, Badge, SkeletonCard, ErrorState, EmptyState } from '../../components/ui'
import { getInstitution } from '../../api/institutions'
import { listCases } from '../../api/cases'
import { StatusBadge } from '../../components/ui'
import { PriorityBadge } from '../../components/ui'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 whitespace-nowrap">{label}</dt>
      <dd className="text-sm text-gray-900 text-right">{children}</dd>
    </div>
  )
}

export default function InstitutionDetailPage() {
  const { id } = useParams()
  const instId = Number(id)

  const { data: inst, isLoading, isError, refetch } = useQuery({
    queryKey: ['institution', instId],
    queryFn: () => getInstitution(instId),
  })

  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['cases', 'institution', instId],
    queryFn: () => listCases({ institution_id: instId, limit: 20 }),
    enabled: !!instId,
  })

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Institution Details"
          breadcrumbs={[{ label: 'Institutions', href: '/institutions' }, { label: 'Loading…' }]}
        />
        <DataNote />
        <div className="mt-4"><SkeletonCard /></div>
      </>
    )
  }

  if (isError || !inst) {
    return (
      <>
        <PageHeader
          title="Institution Details"
          breadcrumbs={[{ label: 'Institutions', href: '/institutions' }]}
        />
        <DataNote />
        <div className="mt-4">
          <ErrorState message="Failed to load institution" onRetry={() => refetch()} />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={inst.canonical_name}
        breadcrumbs={[
          { label: 'Institutions', href: '/institutions' },
          { label: inst.short_name ?? inst.canonical_name },
        ]}
      />
      <DataNote />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Details */}
        <Card title="Details">
          <dl>
            <Row label="Name">{inst.canonical_name}</Row>
            <Row label="Short Name">{inst.short_name ?? '—'}</Row>
            <Row label="Type">{inst.institution_type}</Row>
            <Row label="Status">
              <Badge color={inst.status === 'active' ? 'green' : 'gray'}>{inst.status}</Badge>
            </Row>
            <Row label="State">{inst.state ?? '—'}</Row>
            <Row label="District">{inst.district ?? '—'}</Row>
            <Row label="City">{inst.city ?? '—'}</Row>
            <Row label="Region">{inst.region ?? '—'}</Row>
          </dl>
        </Card>

        {/* Identifiers */}
        <Card title={`Identifiers (${inst.identifiers.length})`}>
          {inst.identifiers.length === 0 ? (
            <EmptyState title="No identifiers" />
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Primary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inst.identifiers.map(ident => (
                  <tr key={ident.id}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{ident.id_type}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-900">{ident.id_value}</td>
                    <td className="px-3 py-2 text-gray-600">{ident.source_system}</td>
                    <td className="px-3 py-2">
                      {ident.is_primary ? (
                        <Badge color="green">Primary</Badge>
                      ) : (
                        <Badge color="gray">—</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Linked cases */}
      <div className="mt-4">
        <Card title={`Linked Cases${casesData ? ` (${casesData.total})` : ''}`}>
          {casesLoading ? (
            <SkeletonCard />
          ) : !casesData || casesData.items.length === 0 ? (
            <EmptyState icon={Building2} title="No cases linked to this institution" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Case #</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {casesData.items.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="font-mono text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {c.case_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate">{c.title}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <PriorityBadge priority={c.priority} />
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
