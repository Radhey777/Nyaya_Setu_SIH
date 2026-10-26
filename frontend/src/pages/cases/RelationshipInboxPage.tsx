import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import {
  DataNote,
  Card,
  Badge,
  Button,
  Modal,
  Select,
  Textarea,
  TableSkeleton,
  ErrorState,
  EmptyState,
  Pagination,
} from '../../components/ui'
import type { BadgeColor } from '../../components/ui'
import { getRelationshipInbox, reviewRelationship } from '../../api/relationships'
import { toast } from '../../hooks/useToast'
import type { ReviewPayload } from '../../api/relationships'
import { ReviewStatus, RelationshipType } from '../../types'

const LIMIT = 20

const DECISION_OPTIONS = [
  { value: 'confirmed', label: 'Confirm' },
  { value: 'rejected', label: 'Reject' },
  { value: 'escalated', label: 'Escalate' },
]

const CORRECTED_TYPE_OPTIONS = Object.values(RelationshipType).map(t => ({
  value: t,
  label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
}))

function reviewColor(s: ReviewStatus): BadgeColor {
  switch (s) {
    case ReviewStatus.pending: return 'yellow'
    case ReviewStatus.confirmed: return 'green'
    case ReviewStatus.rejected: return 'red'
    case ReviewStatus.escalated: return 'orange'
    case ReviewStatus.corrected: return 'blue'
    default: return 'gray'
  }
}

export default function RelationshipInboxPage() {
  const queryClient = useQueryClient()
  const [skip, setSkip] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [decision, setDecision] = useState('confirmed')
  const [rationale, setRationale] = useState('')
  const [correctedType, setCorrectedType] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['relationships', 'inbox', skip],
    queryFn: () => getRelationshipInbox({ skip, limit: LIMIT }),
  })

  const reviewMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReviewPayload }) =>
      reviewRelationship(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', 'inbox'] })
      toast.success('Review submitted')
      setSelected(null)
      setDecision('confirmed')
      setRationale('')
      setCorrectedType('')
    },
    onError: () => toast.error('Review failed'),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const payload: ReviewPayload = {
      decision,
      rationale: rationale || undefined,
      corrected_type: correctedType || undefined,
    }
    reviewMut.mutate({ id: selected, payload })
  }

  return (
    <>
      <PageHeader title="Relationship Inbox" />
      <DataNote message="Pending case relationship candidates from automated matching. Review and confirm or reject each." />

      <div className="mt-4">
        <Card>
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : isError ? (
            <ErrorState message="Failed to load relationship inbox" onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <EmptyState icon={GitBranch} title="No pending relationships" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Case A</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Case B</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(rel => (
                    <tr key={rel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          to={`/cases/${rel.case_a_id}`}
                          className="font-mono text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {rel.case_a?.case_number ?? `#${rel.case_a_id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          to={`/cases/${rel.case_b_id}`}
                          className="font-mono text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {rel.case_b?.case_number ?? `#${rel.case_b_id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                        {rel.relationship_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-semibold">{(rel.score * 100).toFixed(0)}%</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Badge color={reviewColor(rel.review_status)}>
                          {rel.review_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {rel.review_status === ReviewStatus.pending && (
                          <Button size="sm" onClick={() => setSelected(rel.id)}>
                            Review
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

      <Pagination total={total} skip={skip} limit={LIMIT} onPageChange={setSkip} />

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title="Review Relationship"
        size="md"
      >
        <form onSubmit={handleReview} className="space-y-4">
          <Select
            label="Decision"
            required
            value={decision}
            onChange={e => setDecision(e.target.value)}
            options={DECISION_OPTIONS}
          />
          <Textarea
            label="Rationale (optional)"
            value={rationale}
            onChange={e => setRationale(e.target.value)}
          />
          {decision === 'confirmed' && (
            <Select
              label="Corrected Type (optional)"
              value={correctedType}
              onChange={e => setCorrectedType(e.target.value)}
              options={[{ value: '', label: 'Keep as detected' }, ...CORRECTED_TYPE_OPTIONS]}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={reviewMut.isPending}>
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
