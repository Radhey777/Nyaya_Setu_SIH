import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Users, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Badge, TableSkeleton, ErrorState, EmptyState, Card } from '../../components/ui'
import { listUsers, approveUser, rejectUser, suspendUser } from '../../api/users'
import { toast } from '../../hooks/useToast'
import type { BadgeColor } from '../../components/ui'
import type { User } from '../../types'
import { AccountStatus } from '../../types'

const roleColor = (r: string): BadgeColor =>
  r === 'system_admin'
    ? 'red'
    : r === 'senior_management'
    ? 'purple'
    : r === 'bureau_officer'
    ? 'blue'
    : r === 'regional_officer'
    ? 'indigo'
    : r === 'data_admin'
    ? 'orange'
    : r === 'coordination_reviewer'
    ? 'green'
    : 'gray'

const statusColor = (s: AccountStatus): BadgeColor =>
  s === AccountStatus.active
    ? 'green'
    : s === AccountStatus.pending_approval
    ? 'yellow'
    : s === AccountStatus.suspended
    ? 'red'
    : 'gray'

const fmtRole = (r: string) =>
  r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function UserManagementPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', 'limit200'],
    queryFn: () => listUsers({ limit: 200 }),
  })

  const users: User[] = data?.items ?? []

  const approveMut = useMutation({
    mutationFn: (id: number) => approveUser(id),
    onSuccess: () => {
      toast.success('Account approved')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to approve account'),
  })

  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectUser(id),
    onSuccess: () => {
      toast.success('Account rejected')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to reject account'),
  })

  const suspendMut = useMutation({
    mutationFn: (id: number) => suspendUser(id),
    onSuccess: () => {
      toast.success('Account suspended')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('Failed to suspend account'),
  })

  const pending = users.filter(u => u.account_status === AccountStatus.pending_approval)

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" />

      {/* Section 1 — Pending Approvals */}
      <div className="space-y-3">
        {pending.length > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            {pending.length} account(s) pending approval
          </div>
        )}

        {pending.length > 0 && (
          <Card title="Pending Approvals">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Requested At</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pending.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{u.full_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{u.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{u.designation ?? '—'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Badge color={roleColor(u.role)}>{fmtRole(u.role)}</Badge>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {format(new Date(u.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMut.mutate(u.id)}
                            loading={approveMut.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => rejectMut.mutate(u.id)}
                            loading={rejectMut.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {pending.length === 0 && !isLoading && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            No pending approvals
          </div>
        )}
      </div>

      {/* Section 2 — All Users */}
      <Card title={`All Users (${users.length})`}>
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bureau ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{u.full_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge color={roleColor(u.role)}>{fmtRole(u.role)}</Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{u.bureau_id ?? '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge color={statusColor(u.account_status)}>
                        {fmtRole(u.account_status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {u.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300" />
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {u.is_active && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => suspendMut.mutate(u.id)}
                          loading={suspendMut.isPending}
                        >
                          Suspend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
