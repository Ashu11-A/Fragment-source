import type { ButtonProps } from './ui'

export interface GuildSidebarProps {
  className?: string
}

export interface TopNavbarProps {
  className?: string
  onMenuToggle?: () => void
}

export interface NavSidebarProps {
  className?: string
}

export type BotCoreConsoleStreamProps = {
  botId: number | undefined
  enabled: boolean
}

export type ActivityFilter = 'all' | 'success' | 'info' | 'error'

export type BotActivityFeedProps = {
  title: string
  filteredRows: Array<{
    id: number
    message: string
    display: 'success' | 'info' | 'error'
    createdAt: string
    category: string
    level: string
    source: string | null
  }>
  formatRelativeTime: (iso: string) => string
  isLoading: boolean
  onRefetch: () => void | Promise<unknown>
  filter: ActivityFilter
  onFilterChange: (f: ActivityFilter) => void
  showLiveBadge?: boolean
  maxHeightClass?: string
}

export interface BotNotFoundProps {
  title?: string
  message?: string
  retryLabel?: string
  onRetry?: () => void
}

export type IconTileVariant = 'default' | 'bots'
export type IconTileSize = 'sm' | 'md' | 'lg'

export interface IconTileProps {
  icon: React.ComponentType<{ className?: string }>
  size?: IconTileSize
  variant?: IconTileVariant
  iconColor?: string
  interactive?: boolean
  className?: string
}

export interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean
}

export interface SearchWithBadgeProps {
  inputId?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  count?: number
  itemLabel?: string
}

export interface ErrorAlertProps {
  error?: string | null
  variant?: 'default' | 'detailed'
  title?: string
}

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}

export interface PageHeaderProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}

export interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  paddingY?: string
}

export interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  error?: string
  confirmLabel?: string
}
