import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── SkeletonLine ─────────────────────────────────────────────────────────────

interface SkeletonLineProps {
  width?: string
  height?: string
  className?: string
}

export function SkeletonLine({
  width = 'w-full',
  height = 'h-4',
  className,
}: SkeletonLineProps) {
  return (
    <div
      className={twMerge(
        clsx('animate-pulse bg-gray-200 rounded', width, height),
        className
      )}
    />
  )
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
      <SkeletonLine width="w-1/3" height="h-5" />
      <SkeletonLine width="w-full" height="h-4" />
      <SkeletonLine width="w-4/5" height="h-4" />
      <SkeletonLine width="w-2/3" height="h-4" />
    </div>
  )
}

// ─── TableSkeleton ────────────────────────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <SkeletonLine height="h-3" width="w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <SkeletonLine height="h-4" width={colIdx === 0 ? 'w-32' : 'w-24'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
