import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type BadgeColor =
  | 'gray'
  | 'blue'
  | 'indigo'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'green'
  | 'red'
  | 'cyan'

export type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  color?: BadgeColor
  size?: BadgeSize
  children: React.ReactNode
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export function Badge({
  color = 'gray',
  size = 'sm',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center font-medium rounded-full',
          colorClasses[color],
          sizeClasses[size]
        ),
        className
      )}
    >
      {children}
    </span>
  )
}
