import React from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 border border-transparent',
  secondary:
    'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-indigo-500',
  danger:
    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 border border-transparent',
  ghost:
    'hover:bg-gray-100 text-gray-600 focus:ring-gray-400 border border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center gap-2 font-medium rounded-md',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'transition-colors duration-150',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && 'opacity-60 cursor-not-allowed pointer-events-none'
        ),
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
