import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Badge, SkeletonCard, EmptyState } from '../../components/ui'
import { listNotifications, markRead, markAllRead } from '../../api/notifications'
import { toast } from '../../hooks/useToast'
import type { BadgeColor } from '../../components/ui'

const priColor = (p: string): BadgeColor =>
  p === 'high' || p === 'urgent' || p === 'critical'
    ? 'red'
    : p === 'medium'
    ? 'orange'
    : p === 'low'
    ? 'gray'
    : 'blue'

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications({ limit: 100 }),
  })

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      toast.success('All marked read')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('Failed to mark all as read'),
  })

  const markReadMut = useMutation({
    mutationFn: (id: number) => markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error('Failed to mark as read'),
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        actions={
          <Button onClick={() => markAllMut.mutate()} loading={markAllMut.isPending}>
            Mark All Read
          </Button>
        }
      />
      <DataNote />

      {isLoading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" />
      ) : (
        <div className="space-y-3">
          {items.map(n => (
            <div
              key={n.id}
              className={
                'rounded-lg border p-4 ' +
                (n.is_read ? 'bg-white border-gray-200' : 'bg-indigo-50 border-indigo-200')
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className={'text-sm ' + (n.is_read ? 'text-gray-900' : 'font-semibold text-gray-900')}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">
                      {format(new Date(n.created_at), 'dd MMM yyyy HH:mm')}
                    </span>
                    <Badge color={priColor(n.priority)}>{n.priority}</Badge>
                  </div>
                </div>
                {!n.is_read && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => markReadMut.mutate(n.id)}
                    loading={markReadMut.isPending}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
