import { cn } from '@/lib/utils'
import type { IconTileProps, IconTileVariant, IconTileSize } from '@/types/components'

const sizeMap: Record<IconTileSize, { container: string; icon: string }> = {
  sm: { container: 'w-10 h-10', icon: 'w-5 h-5' },
  md: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  lg: { container: 'w-16 h-16', icon: 'w-8 h-8' },
}

const variantMap: Record<IconTileVariant, string> = {
  default: 'ui-icon-tile',
  bots: 'ui-icon-tile-bots flex items-center justify-center rounded-2xl',
}

export function IconTile({
  icon: Icon,
  size = 'md',
  variant = 'default',
  iconColor = 'text-blurple-400',
  interactive = false,
  className,
}: IconTileProps) {
  const { container, icon: iconSize } = sizeMap[size]
  return (
    <div
      className={cn(
        variantMap[variant],
        container,
        interactive && 'group-hover:scale-110 transition-transform duration-300',
        className,
      )}
    >
      <Icon className={cn(iconSize, iconColor)} />
    </div>
  )
}
