import React from 'react'
import { format } from 'date-fns'
import { Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

export interface TimelineEvent {
  id: number | string
  type: string
  description: string
  performedBy?: string
  createdAt: string
  icon?: LucideIcon
}

interface TimelineProps {
  events: TimelineEvent[]
}

function formatTimestamp(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">No events to display.</p>
    )
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-0">
      {events.map((event, idx) => {
        const Icon = event.icon ?? Activity
        const isLast = idx === events.length - 1
        return (
          <li
            key={event.id}
            className={clsx('relative pl-8', !isLast && 'pb-6')}
          >
            {/* Dot */}
            <span
              className="absolute -left-[11px] flex h-5 w-5 items-center justify-center
                rounded-full bg-indigo-600 ring-4 ring-white"
              aria-hidden="true"
            >
              <Icon className="h-2.5 w-2.5 text-white" />
            </span>

            {/* Content */}
            <div>
              <span className="text-sm font-semibold text-gray-900">{event.type}</span>
              <p className="mt-0.5 text-sm text-gray-700">{event.description}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                {event.performedBy && (
                  <span>By: <span className="font-medium text-gray-700">{event.performedBy}</span></span>
                )}
                <time dateTime={event.createdAt}>
                  {formatTimestamp(event.createdAt)}
                </time>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
