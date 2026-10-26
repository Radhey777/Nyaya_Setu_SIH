import React from 'react'
import { Badge } from './Badge'
import type { BadgeColor } from './Badge'

interface StatusBadgeProps {
  status: string
}

const statusColorMap: Record<string, BadgeColor> = {
  received: 'gray',
  triaged: 'blue',
  assigned: 'indigo',
  under_process: 'yellow',
  awaiting_information: 'orange',
  decision_review: 'purple',
  disposed: 'green',
  escalated: 'red',
  transfer_requested: 'orange',
  transferred: 'cyan',
  closed: 'green',
  reopened: 'yellow',
  // fallback entries from CaseStatus enum
  overdue: 'red',
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color: BadgeColor = statusColorMap[status] ?? 'gray'
  return <Badge color={color}>{formatStatus(status)}</Badge>
}
