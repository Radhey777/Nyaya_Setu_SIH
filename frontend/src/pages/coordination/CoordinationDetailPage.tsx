import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isPast } from 'date-fns'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import {
  DataNote,
  Button,
  Badge,
  Modal,
  Select,
  Textarea,
  Input,
  Card,
  SkeletonCard,
  ErrorState,
  EmptyState,
} from '../../components/ui'
import type { BadgeColor } from '../../components/ui'
import {
  getCoordination,
  acknowledge,
  recordDecision,
  addTask,
  completeTask,
  closeCoordination,
} from '../../api/coordination'
import type { DecisionPayload, ClosurePayload } from '../../api/coordination'
import { listUsers } from '../../api/users'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../hooks/useToast'
import { CoordinationStatus } from '../../types'

// ─── helpers ───────────────────────────────────────────────────────────────

const fmt = (v?: string, p = 'dd MMM yyyy') => (v ? format(new Date(v), p) : '—')

function fmtStatus(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function coordColor(status: CoordinationStatus): BadgeColor {
  switch (status) {
    case CoordinationStatus.draft:
      return 'gray'
    case CoordinationStatus.pending_acknowledgement:
      return 'yellow'
    case CoordinationStatus.active:
      return 'indigo'
    case CoordinationStatus.overdue:
      return 'red'
    case CoordinationStatus.resolved:
      return 'green'
    case CoordinationStatus.closed:
      return 'green'
    default:
      return 'gray'
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 text-right">{children}</dd>
    </div>
  )
}

function OverdueDate({
  value,
  status,
}: {
  value?: string
  status: CoordinationStatus
}) {
  const overdue = value ? isPast(new Date(value)) : false
  const showRed =
    overdue &&
    status !== CoordinationStatus.closed &&
    status !== CoordinationStatus.resolved
  if (showRed) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        {fmt(value)}
      </span>
    )
  }
  return <>{fmt(value)}</>
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function CoordinationDetailPage() {
  const { id } = useParams()
  const coordId = Number(id)
  const { user, hasRole } = useAuth()
  const queryClient = useQueryClient()

  const { data: item, isLoading, isError, refetch } = useQuery({
    queryKey: ['coordination', coordId],
    queryFn: () => getCoordination(coordId),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', 'limit50'],
    queryFn: () => listUsers({ limit: 50 }),
  })

  // ── mutations ──
  const ackMut = useMutation({
    mutationFn: () => acknowledge(coordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordination', coordId] })
      toast.success('Acknowledged')
    },
    onError: () => toast.error('Failed to acknowledge'),
  })

  const decisionMut = useMutation({
    mutationFn: (data: DecisionPayload) => recordDecision(coordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordination', coordId] })
      toast.success('Decision recorded')
      setShowDecision(false)
      setRationale('')
      setDecision('coordinate')
    },
    onError: () => toast.error('Failed to record decision'),
  })

  const addTaskMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => addTask(coordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordination', coordId] })
      toast.success('Task added')
      setShowAddTask(false)
      setTaskTitle('')
      setTaskDescription('')
      setTaskDueDate('')
      setTaskAssigneeId('')
    },
    onError: () => toast.error('Failed to add task'),
  })

  const completeMut = useMutation({
    mutationFn: ({ taskId }: { taskId: number }) =>
      completeTask(coordId, taskId, { completion_notes: 'Completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordination', coordId] })
      toast.success('Task completed')
    },
    onError: () => toast.error('Failed to complete task'),
  })

  const closeMut = useMutation({
    mutationFn: (data: ClosurePayload) => closeCoordination(coordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordination', coordId] })
      toast.success('Coordination closed')
      setShowClose(false)
      setClosureNotes('')
      setIsException(false)
      setExceptionReason('')
    },
    onError: () => toast.error('Failed to close coordination'),
  })

  // ── modal state ──
  const [showDecision, setShowDecision] = useState(false)
  const [decision, setDecision] = useState('coordinate')
  const [rationale, setRationale] = useState('')

  const [showAddTask, setShowAddTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')

  const [showClose, setShowClose] = useState(false)
  const [closureNotes, setClosureNotes] = useState('')
  const [isException, setIsException] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')

  // ── loading / error ──
  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Coordination Details"
          breadcrumbs={[
            { label: 'Coordination', href: '/coordination' },
            { label: 'Loading…' },
          ]}
        />
        <DataNote />
        <div className="mt-4">
          <SkeletonCard />
        </div>
        <div className="mt-4">
          <SkeletonCard />
        </div>
      </>
    )
  }

  if (isError || !item) {
    return (
      <>
        <PageHeader
          title="Coordination Details"
          breadcrumbs={[{ label: 'Coordination', href: '/coordination' }]}
        />
        <DataNote />
        <div className="mt-4">
          <ErrorState
            message="Failed to load coordination"
            onRetry={() => refetch()}
          />
        </div>
      </>
    )
  }

  const canDecision =
    (item.status === CoordinationStatus.draft ||
      item.status === CoordinationStatus.pending_acknowledgement) &&
    hasRole(['coordination_reviewer', 'system_admin'])
  const canAddTask =
    item.status === CoordinationStatus.active ||
    item.status === CoordinationStatus.overdue
  const canClose =
    hasRole(['coordination_reviewer', 'system_admin']) &&
    item.status !== CoordinationStatus.closed

  return (
    <>
      <PageHeader
        title={`${item.reference_number} — ${item.title}`}
        breadcrumbs={[
          { label: 'Coordination', href: '/coordination' },
          { label: item.reference_number },
        ]}
      />
      <DataNote />

      {/* prominent status */}
      <div className="mt-4">
        <Badge color={coordColor(item.status)} size="md">
          {fmtStatus(item.status)}
        </Badge>
      </div>

      {/* amber warning */}
      <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Closing this coordination item does NOT affect the status or ownership
        of underlying complaint cases.
      </div>

      {/* Section 1 — Overview */}
      <div className="mt-4">
        <Card title="Overview">
          <dl>
            <Row label="Status">
              <Badge color={coordColor(item.status)}>{fmtStatus(item.status)}</Badge>
            </Row>
            <Row label="Decision">{item.decision ?? '—'}</Row>
            <Row label="Owner">{item.owner?.full_name ?? '—'}</Row>
            <Row label="Created">{fmt(item.created_at, 'dd MMM yyyy')}</Row>
            <Row label="Acknowledge By">
              <OverdueDate value={item.acknowledge_by} status={item.status} />
            </Row>
            <Row label="Action Due Date">
              <OverdueDate value={item.action_due_date} status={item.status} />
            </Row>
          </dl>
        </Card>
      </div>

      {/* Section 2 — Participants */}
      <div className="mt-4">
        <Card title={`Participants (${item.participants.length})`}>
          {item.participants.length === 0 ? (
            <EmptyState title="No participants" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {item.participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {p.bureau?.name ?? p.user?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.role_in_coordination}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.acknowledged ? (
                      <Badge color="green">Acknowledged</Badge>
                    ) : (
                      <Badge color="red">Pending</Badge>
                    )}
                    {p.user?.id === user?.id && !p.acknowledged && (
                      <Button
                        size="sm"
                        onClick={() => ackMut.mutate()}
                        loading={ackMut.isPending}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Section 3 — Tasks */}
      <div className="mt-4">
        <Card title={`Tasks (${item.tasks.length})`}>
          {item.tasks.length === 0 ? (
            <EmptyState title="No tasks" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {item.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {task.assigned_to?.full_name ?? 'Unassigned'} · Due{' '}
                      {fmt(task.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.is_completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300" />
                    )}
                    {!task.is_completed && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => completeMut.mutate({ taskId: task.id })}
                        loading={completeMut.isPending}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Action bar (role / status gated) */}
      {(canDecision || canAddTask || canClose) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {canDecision && (
            <Button onClick={() => setShowDecision(true)}>Record Decision</Button>
          )}
          {canAddTask && (
            <Button variant="secondary" onClick={() => setShowAddTask(true)}>
              Add Task
            </Button>
          )}
          {canClose && (
            <Button variant="danger" onClick={() => setShowClose(true)}>
              Close Coordination
            </Button>
          )}
        </div>
      )}

      {/* ── Decision modal ── */}
      <Modal
        isOpen={showDecision}
        onClose={() => setShowDecision(false)}
        title="Record Decision"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!rationale) return
            decisionMut.mutate({ decision, rationale })
          }}
          className="space-y-4"
        >
          <Select
            label="Decision"
            required
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            options={[
              { value: 'coordinate', label: 'Coordinate' },
              { value: 'link_related', label: 'Link Related' },
              { value: 'keep_separate', label: 'Keep Separate' },
              { value: 'dismiss', label: 'Dismiss' },
              { value: 'escalate', label: 'Escalate' },
            ]}
          />
          <Textarea
            label="Rationale"
            required
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            error={!rationale ? 'Rationale is required' : undefined}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowDecision(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={decisionMut.isPending} disabled={!rationale}>
              Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Add task modal ── */}
      <Modal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        title="Add Task"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!taskTitle) return
            addTaskMut.mutate({
              title: taskTitle,
              description: taskDescription || undefined,
              due_date: taskDueDate || undefined,
              assigned_to_id: taskAssigneeId ? Number(taskAssigneeId) : undefined,
            })
          }}
          className="space-y-4"
        >
          <Input
            label="Title"
            required
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            error={!taskTitle ? 'Required' : undefined}
          />
          <Textarea
            label="Description"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
          />
          <div className="w-full">
            <label
              htmlFor="add-task-due-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Due Date
            </label>
            <input
              id="add-task-due-date"
              type="datetime-local"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <Select
            label="Assignee"
            value={taskAssigneeId}
            onChange={(e) => setTaskAssigneeId(e.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...(usersData?.items ?? []).map((u) => ({
                value: String(u.id),
                label: u.full_name,
              })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowAddTask(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={addTaskMut.isPending} disabled={!taskTitle}>
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Close modal ── */}
      <Modal
        isOpen={showClose}
        onClose={() => setShowClose(false)}
        title="Close Coordination"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!closureNotes) return
            closeMut.mutate({
              closure_notes: closureNotes,
              is_exception: isException,
              ...(isException ? { exception_reason: exceptionReason } : {}),
            } as ClosurePayload)
          }}
          className="space-y-4"
        >
          <Textarea
            label="Closure Notes"
            required
            value={closureNotes}
            onChange={(e) => setClosureNotes(e.target.value)}
            error={!closureNotes ? 'Required' : undefined}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isException}
              onChange={(e) => setIsException(e.target.checked)}
            />
            Exception closure
          </label>
          {isException && (
            <Textarea
              label="Exception Reason"
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={closeMut.isPending} disabled={!closureNotes}>
              Close Coordination
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
