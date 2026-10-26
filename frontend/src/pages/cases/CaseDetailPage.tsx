import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { PageHeader } from '../../components/layout/PageHeader'
import {
  DataNote,
  Button,
  Card,
  Badge,
  Modal,
  Select,
  Textarea,
  SkeletonCard,
  ErrorState,
  EmptyState,
  StatusBadge,
  PriorityBadge,
  Timeline,
} from '../../components/ui'
import type { TimelineEvent } from '../../components/ui'
import {
  getCase,
  getTimeline,
  changeStatus,
  addAction,
  assignCase,
} from '../../api/cases'
import { listUsers } from '../../api/users'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../hooks/useToast'
import { CaseStatus } from '../../types'

const fmt = (v?: string) => (v ? format(new Date(v), 'dd MMM yyyy') : '—')

const STATUS_OPTIONS = Object.values(CaseStatus).map(s => ({
  value: s,
  label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}))

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 whitespace-nowrap">{label}</dt>
      <dd className="text-sm text-gray-900 text-right">{children}</dd>
    </div>
  )
}

export default function CaseDetailPage() {
  const { id } = useParams()
  const caseId = Number(id)
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()

  const { data: c, isLoading, isError, refetch } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => getCase(caseId),
  })

  const { data: timeline } = useQuery({
    queryKey: ['case', caseId, 'timeline'],
    queryFn: () => getTimeline(caseId),
    enabled: !!caseId,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', 'limit50'],
    queryFn: () => listUsers({ limit: 50 }),
  })

  // ── change status ──
  const [showStatus, setShowStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')

  const statusMut = useMutation({
    mutationFn: () => changeStatus(caseId, { new_status: newStatus, reason: statusReason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId, 'timeline'] })
      toast.success('Status updated')
      setShowStatus(false)
      setNewStatus('')
      setStatusReason('')
    },
    onError: () => toast.error('Failed to update status'),
  })

  // ── add action / note ──
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState('')

  const noteMut = useMutation({
    mutationFn: () => addAction(caseId, { action_type: 'note', description: noteText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId, 'timeline'] })
      toast.success('Note added')
      setShowNote(false)
      setNoteText('')
    },
    onError: () => toast.error('Failed to add note'),
  })

  // ── assign officer ──
  const [showAssign, setShowAssign] = useState(false)
  const [assigneeId, setAssigneeId] = useState('')

  const assignMut = useMutation({
    mutationFn: () => assignCase(caseId, { officer_id: Number(assigneeId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      toast.success('Case assigned')
      setShowAssign(false)
      setAssigneeId('')
    },
    onError: () => toast.error('Failed to assign case'),
  })

  const canChangeStatus = hasRole(['bureau_officer', 'regional_officer', 'system_admin'])
  const canAssign = hasRole(['bureau_officer', 'system_admin'])

  const timelineEvents: TimelineEvent[] = (timeline ?? []).map(a => ({
    id: a.id,
    type: a.action_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: a.description,
    performedBy: a.performed_by?.full_name,
    createdAt: a.created_at,
  }))

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Case Details"
          breadcrumbs={[{ label: 'Cases', href: '/cases' }, { label: 'Loading…' }]}
        />
        <DataNote />
        <div className="mt-4"><SkeletonCard /></div>
      </>
    )
  }

  if (isError || !c) {
    return (
      <>
        <PageHeader
          title="Case Details"
          breadcrumbs={[{ label: 'Cases', href: '/cases' }]}
        />
        <DataNote />
        <div className="mt-4">
          <ErrorState message="Failed to load case" onRetry={() => refetch()} />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={c.case_number}
        breadcrumbs={[{ label: 'Cases', href: '/cases' }, { label: c.case_number }]}
      />
      <DataNote />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Case details */}
        <Card title="Details">
          <dl>
            <Row label="Title">{c.title}</Row>
            <Row label="Status"><StatusBadge status={c.status} /></Row>
            <Row label="Priority"><PriorityBadge priority={c.priority} /></Row>
            <Row label="Category">{c.category}</Row>
            <Row label="Bureau">{c.bureau?.name ?? '—'}</Row>
            <Row label="Institution">{c.institution?.canonical_name ?? '—'}</Row>
            <Row label="Assigned Officer">{c.assigned_officer?.full_name ?? '—'}</Row>
            <Row label="Received">{fmt(c.received_date)}</Row>
            <Row label="Due Date">
              {c.due_date ? (
                <span className={new Date(c.due_date) < new Date() && c.status !== CaseStatus.closed && c.status !== CaseStatus.disposed ? 'text-red-600 font-medium' : ''}>
                  {fmt(c.due_date)}
                </span>
              ) : '—'}
            </Row>
            {c.summary && (
              <div className="mt-3 text-sm text-gray-700">
                <p className="font-medium text-gray-500 text-xs uppercase mb-1">Summary</p>
                <p>{c.summary}</p>
              </div>
            )}
          </dl>
        </Card>

        {/* Action bar + status */}
        <div className="space-y-4">
          <Card title="Actions">
            <div className="flex flex-wrap gap-2">
              {canChangeStatus && (
                <Button size="sm" onClick={() => setShowStatus(true)}>
                  Change Status
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setShowNote(true)}>
                Add Note
              </Button>
              {canAssign && (
                <Button size="sm" variant="secondary" onClick={() => setShowAssign(true)}>
                  Assign Officer
                </Button>
              )}
            </div>
          </Card>

          {c.next_action && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              <span className="font-medium">Next action: </span>{c.next_action}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-4">
        <Card title="Timeline">
          {timelineEvents.length === 0 ? (
            <EmptyState title="No actions recorded yet" />
          ) : (
            <Timeline events={timelineEvents} />
          )}
        </Card>
      </div>

      {/* Change Status modal */}
      <Modal isOpen={showStatus} onClose={() => setShowStatus(false)} title="Change Status" size="sm">
        <form
          onSubmit={e => { e.preventDefault(); if (!newStatus) return; statusMut.mutate() }}
          className="space-y-4"
        >
          <Select
            label="New Status"
            required
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            options={[{ value: '', label: 'Select status…' }, ...STATUS_OPTIONS]}
          />
          <Textarea
            label="Reason (optional)"
            value={statusReason}
            onChange={e => setStatusReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowStatus(false)}>Cancel</Button>
            <Button type="submit" loading={statusMut.isPending} disabled={!newStatus}>Update</Button>
          </div>
        </form>
      </Modal>

      {/* Add Note modal */}
      <Modal isOpen={showNote} onClose={() => setShowNote(false)} title="Add Note" size="sm">
        <form
          onSubmit={e => { e.preventDefault(); if (!noteText) return; noteMut.mutate() }}
          className="space-y-4"
        >
          <Textarea
            label="Note"
            required
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            error={!noteText ? 'Required' : undefined}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowNote(false)}>Cancel</Button>
            <Button type="submit" loading={noteMut.isPending} disabled={!noteText}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Officer modal */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="Assign Officer" size="sm">
        <form
          onSubmit={e => { e.preventDefault(); if (!assigneeId) return; assignMut.mutate() }}
          className="space-y-4"
        >
          <Select
            label="Officer"
            required
            value={assigneeId}
            onChange={e => setAssigneeId(e.target.value)}
            options={[
              { value: '', label: 'Select officer…' },
              ...(usersData?.items ?? []).map(u => ({
                value: String(u.id),
                label: u.full_name,
              })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button type="submit" loading={assignMut.isPending} disabled={!assigneeId}>Assign</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
