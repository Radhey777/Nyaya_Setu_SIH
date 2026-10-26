import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Briefcase, GitBranch, Clock, ArrowRightLeft } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Card, SkeletonCard, ErrorState } from '../../components/ui'
import { getDashboard } from '../../api/analytics'
import { useAuth } from '../../contexts/AuthContext'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 bg-white ${color}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => getDashboard(user?.bureau_id ? { bureau_id: user.bureau_id } : undefined),
  })

  return (
    <>
      <PageHeader title="Dashboard" />
      <DataNote />

      {isLoading ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className="mt-4">
          <ErrorState message="Failed to load dashboard statistics" onRetry={() => refetch()} />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Cases"
              value={data?.total_cases ?? 0}
              icon={<Briefcase className="h-8 w-8 text-indigo-500" />}
              color="border-indigo-100"
            />
            <StatCard
              label="Overdue Cases"
              value={data?.overdue_cases ?? 0}
              icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
              color="border-red-100"
            />
            <StatCard
              label="Pending Coordination"
              value={data?.pending_coordination ?? 0}
              icon={<GitBranch className="h-8 w-8 text-yellow-500" />}
              color="border-yellow-100"
            />
            <StatCard
              label="Pending Transfers"
              value={data?.pending_transfers ?? 0}
              icon={<ArrowRightLeft className="h-8 w-8 text-purple-500" />}
              color="border-purple-100"
            />
          </div>

          {/* Cases by status */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Cases by Status">
              {Object.keys(data?.cases_by_status ?? {}).length === 0 ? (
                <p className="text-sm text-gray-500">No data available.</p>
              ) : (
                <dl className="space-y-2">
                  {Object.entries(data?.cases_by_status ?? {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <dt className="text-sm text-gray-600 capitalize">
                        {status.replace(/_/g, ' ')}
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900">{count}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>

            <Card title="Cases by Bureau">
              {Object.keys(data?.cases_by_bureau ?? {}).length === 0 ? (
                <p className="text-sm text-gray-500">No data available.</p>
              ) : (
                <dl className="space-y-2">
                  {Object.entries(data?.cases_by_bureau ?? {}).map(([bureau, count]) => (
                    <div key={bureau} className="flex items-center justify-between">
                      <dt className="text-sm text-gray-600">{bureau}</dt>
                      <dd className="text-sm font-semibold text-gray-900">{count}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          </div>

          {/* Unreviewed relationships */}
          {(data?.unreviewed_relationships ?? 0) > 0 && (
            <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>{data?.unreviewed_relationships}</strong> case relationship
                {data!.unreviewed_relationships !== 1 ? 's' : ''} pending review in the
                Relationships inbox.
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}
