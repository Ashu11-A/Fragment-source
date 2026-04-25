import { cn } from '@/lib/utils'
import { Bot, Plus, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useBotStore } from '@/stores/botStore'
import { useBotsList } from '@/hooks/useBots'
import { useNavigate } from '@tanstack/react-router'

interface GuildSidebarProps {
  className?: string
}

/** Thin left sidebar with bot/server selection icons (Discord-style) */
export function GuildSidebar({ className }: GuildSidebarProps) {
  const { bots, statuses, isLoading } = useBotsList()

  const { selectedBotId, setSelectedBotId } = useBotStore()
  const navigate = useNavigate()

  return (
    <aside
      className={cn(
        'flex flex-col items-center w-[72px] min-w-[72px] py-3 gap-2 overflow-y-auto',
        'border-r ui-sidebar-guild',
        className,
      )}
    >
      {/* Home / Dashboard icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            id="guild-home-button"
            className={cn(
              'group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300',
              selectedBotId === null
                ? 'ui-guild-pill rounded-xl'
                : 'ui-guild-pill-mid rounded-2xl',
            )}
            onClick={() => {
              setSelectedBotId(null)
              navigate({ to: '/' })
            }}
          >
            <span
              className={cn(
                'ui-guild-indicator absolute left-0 -translate-x-[18px] w-1 rounded-r-full transition-all duration-200',
                selectedBotId === null ? 'h-10' : 'h-5 group-hover:h-10',
              )}
            />
            <Bot className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Dashboard</TooltipContent>
      </Tooltip>

      <Separator className="w-8 mx-auto" />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center w-12 h-12">
          <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
        </div>
      )}

      {/* Bot icons */}
      {bots.map((bot) => {
        const isSelected = selectedBotId === bot.id
        const initials = bot.name
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        return (
          <Tooltip key={bot.id}>
            <TooltipTrigger asChild>
              <button
                id={`guild-bot-${bot.id}`}
                className={cn(
                  'group relative flex items-center justify-center w-12 h-12 transition-all duration-300',
                  isSelected
                    ? 'ui-guild-avatar-selected rounded-xl'
                    : 'ui-guild-avatar rounded-3xl',
                )}
                onClick={() => {
                  setSelectedBotId(bot.id)
                  navigate({ to: `/bots/${bot.id}` as any })
                }}
              >
                <span
                  className={cn(
                    'ui-guild-indicator absolute left-0 -translate-x-[18px] w-1 rounded-r-full transition-all duration-200',
                    isSelected ? 'h-10' : 'h-0 group-hover:h-5',
                  )}
                />
                {/* Online/Offline indicator */}
                <div
                  className={cn(
                    'ui-guild-status absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 z-10',
                    statuses[bot.id] ? 'ui-guild-status-on' : 'ui-guild-status-off',
                  )}
                />
                <span className="text-sm font-bold">{initials}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="flex flex-col">
                <span>{bot.name}</span>
                <span className="text-[10px] text-surface-400">
                  {statuses[bot.id] ? 'Online' : 'Offline'}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}

      {bots.length > 0 && <Separator className="w-8 mx-auto" />}

      {/* Add bot button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            id="guild-add-button"
            className={cn(
              'ui-guild-add flex items-center justify-center w-12 h-12 rounded-3xl transition-all duration-300',
            )}
            onClick={() => navigate({ to: '/bots' })}
          >
            <Plus className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Add Bot</TooltipContent>
      </Tooltip>
    </aside>
  )
}
