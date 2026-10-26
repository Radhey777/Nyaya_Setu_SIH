import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataNote, Button, Input, Textarea, Card } from '../../components/ui'
import { listBureaus } from '../../api/bureaus'
import { listUsers } from '../../api/users'
import { createCoordination } from '../../api/coordination'
import { toast } from '../../hooks/useToast'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  acknowledge_by: z.string().optional(),
  action_due_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CreateCoordinationPage() {
  const navigate = useNavigate()
  const [bureauIds, setBureauIds] = useState<number[]>([])
  const [userIds, setUserIds] = useState<number[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { data: bureaus } = useQuery({
    queryKey: ['bureaus'],
    queryFn: listBureaus,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', 'limit50'],
    queryFn: () => listUsers({ limit: 50 }),
  })

  const createMut = useMutation({
    mutationFn: (v: Record<string, unknown>) => createCoordination(v),
    onSuccess: (res) => {
      toast.success('Coordination created')
      navigate(`/coordination/${res.id}`)
    },
    onError: () => toast.error('Failed to create coordination'),
  })

  const onSubmit = (values: FormValues) => {
    createMut.mutate({
      title: values.title,
      description: values.description || undefined,
      acknowledge_by: values.acknowledge_by || undefined,
      action_due_date: values.action_due_date || undefined,
      bureau_ids: bureauIds,
      participant_user_ids: userIds,
    })
  }

  return (
    <>
      <PageHeader
        title="New Coordination Item"
        breadcrumbs={[
          { label: 'Coordination', href: '/coordination' },
          { label: 'New' },
        ]}
      />
      <DataNote />

      <div className="mt-4 max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Title"
              required
              error={errors.title?.message}
              {...register('title')}
            />
            <Textarea label="Description" {...register('description')} />
            <Input
              label="Acknowledge By"
              type="datetime-local"
              {...register('acknowledge_by')}
            />
            <Input
              label="Action Due Date"
              type="datetime-local"
              {...register('action_due_date')}
            />

            {/* Bureau checkboxes */}
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Bureaus
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(bureaus ?? []).map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={bureauIds.includes(b.id)}
                      onChange={(e) =>
                        setBureauIds((prev) =>
                          e.target.checked
                            ? [...prev, b.id]
                            : prev.filter((x) => x !== b.id)
                        )
                      }
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>

            {/* User checkboxes */}
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Participants
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(usersData?.items ?? []).map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={userIds.includes(u.id)}
                      onChange={(e) =>
                        setUserIds((prev) =>
                          e.target.checked
                            ? [...prev, u.id]
                            : prev.filter((x) => x !== u.id)
                        )
                      }
                    />
                    {u.full_name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={createMut.isPending}>
                Create Coordination
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}
