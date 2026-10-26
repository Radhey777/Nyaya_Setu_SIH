import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface DataNoteProps {
  message?: string
}

const DEFAULT_MESSAGE =
  'DEMO DATA — Synthetic prototype data. Not official AICTE records.'

export function DataNote({ message = DEFAULT_MESSAGE }: DataNoteProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5">
      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
      <span className="text-xs font-medium text-amber-800">{message}</span>
    </div>
  )
}
