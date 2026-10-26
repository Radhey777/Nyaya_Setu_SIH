import React from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          z-50 min-w-max max-w-xs px-2.5 py-1.5
          rounded-md bg-gray-900 text-white text-xs font-medium shadow-lg
          opacity-0 scale-95 transition-all duration-150
          group-hover:opacity-100 group-hover:scale-100
          whitespace-pre-wrap
        "
      >
        {content}
        {/* Arrow */}
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"
          aria-hidden="true"
        />
      </span>
    </span>
  )
}
