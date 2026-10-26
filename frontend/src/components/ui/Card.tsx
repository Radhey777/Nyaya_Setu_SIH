import React from 'react'
import { twMerge } from 'tailwind-merge'

interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Card({ title, action, children, className }: CardProps) {
  return (
    <div
      className={twMerge(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
