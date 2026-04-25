import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'badge-default',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    outline: 'badge-outline',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
