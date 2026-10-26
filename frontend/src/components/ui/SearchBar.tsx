import React, { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onClear?: () => void
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  onClear,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value changes (e.g., reset)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value
    setLocalValue(newVal)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange(newVal)
    }, 300)
  }

  const handleClear = () => {
    setLocalValue('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onChange('')
    onClear?.()
  }

  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="block w-full rounded-md border border-gray-300 pl-9 pr-8 py-2 text-sm
          text-gray-900 placeholder-gray-400 shadow-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          transition-colors duration-150"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 p-0.5 text-gray-400 hover:text-gray-600 rounded-sm
            focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
