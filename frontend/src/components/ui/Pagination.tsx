import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface PaginationProps {
  total: number
  skip: number
  limit: number
  onPageChange: (newSkip: number) => void
}

export function Pagination({ total, skip, limit, onPageChange }: PaginationProps) {
  const currentPage = Math.floor(skip / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const rangeStart = total === 0 ? 0 : skip + 1
  const rangeEnd = Math.min(skip + limit, total)

  // Build page number array (show up to 7 pages with ellipsis)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | 'ellipsis')[] = [1]
    if (currentPage > 3) pages.push('ellipsis')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  const goTo = (page: number) => {
    onPageChange((page - 1) * limit)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <p className="text-sm text-gray-600">
        Showing{' '}
        <span className="font-medium">{rangeStart}</span>
        {' '}–{' '}
        <span className="font-medium">{rangeEnd}</span>
        {' '}of{' '}
        <span className="font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className={clsx(
            'p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-sm text-gray-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => goTo(item)}
              className={clsx(
                'min-w-[32px] h-8 px-2 rounded-md text-sm font-medium',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                item === currentPage
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={clsx(
            'p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
