import React from 'react'
import { Badge } from './Badge'
import type { BadgeColor } from './Badge'

interface PriorityBadgeProps {
  priority: string
}

const priorityColorMap: Record<string, BadgeColor> = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
  critical: 'red',
}

function formatPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color: BadgeColor = priorityColorMap[priority] ?? 'gray'
  return <Badge color={color}>{formatPriority(priority)}</Badge>
}
