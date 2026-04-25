import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Home, Puzzle, Users, Settings, Shield, ChevronRight, Bot, LayoutDashboard, Database, Activity, Package, Download } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/providers/AuthProvider'
import { trpc } from '@/lib/trpc'

interface NavSidebarProps {
  className?: string
}

const navigationItems = [
  { label: 'Home', icon: Home, path: '/' as const, exact: true },
  { label: 'Bots', icon: Bot, path: '/bots' as const, exact: true },
  { label: 'Distribuição', icon: Download, path: '/downloads' as const, exact: true },
  { label: 'Plugins', icon: Puzzle, path: '/plugins' as const },
  { label: 'Users', icon: Users, path: '/users' as const, adminOnly: true },
  { label: 'Admin', icon: Shield, path: '/admin' as const, adminOnly: true },
  { label: 'Settings', icon: Settings, path: '/settings' as const },
]

/** Secondary navigation sidebar */
export function NavSidebar({ className }: NavSidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrator'

  // Extract botId from URL if we are in a bot route
  const botRouteMatch = location.pathname.match(/^\/bots\/(\d+)/)
  const botId = botRouteMatch ? parseInt(botRouteMatch[1], 10) : null

  const { data: botResponse } = trpc.bots.get.useQuery(
    { id: botId as number },
    { enabled: !!botId }
  )

  const bot = botResponse?.data

  const filteredItems = navigationItems.filter(
    (item) => !item.adminOnly || isAdmin,
  )

  const renderGeneralNavigation = () => (
    <nav className="flex flex-col gap-1">
      {filteredItems.map(({ label, icon: Icon, path, exact }) => {
        const isActive = exact
          ? location.pathname === path
          : location.pathname.startsWith(path)

        return (
          <Link
            key={path}
            to={path}
            id={`nav-${label.toLowerCase()}`}
            className={cn(
              'ui-nav-link group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isActive && 'ui-nav-link-active',
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 transition-colors shrink-0',
                isActive ? 'text-blurple-400' : 'text-surface-500 group-hover:text-surface-300',
              )}
            />
            {label}
            {isActive && (
              <div className="ui-pulse-dot ml-auto w-1.5 h-1.5 rounded-full animate-pulse-soft" />
            )}
          </Link>
        )
      })}
    </nav>
  )

  const renderBotNavigation = () => {
    // These options are mostly mocked for now, to be expanded later
    const botItems = [
      { label: 'Overview', icon: LayoutDashboard, path: `/bots/${botId}`, exact: true },
      { label: 'Configuration', icon: Settings, path: `/bots/${botId}/config` },
      { label: 'Database', icon: Database, path: `/bots/${botId}/database` },
      { label: 'Logs', icon: Activity, path: `/bots/${botId}/logs`, exact: true },
      { label: 'Plugins', icon: Package, path: `/bots/${botId}/plugins`, exact: true },
    ]

    return (
      <div className="flex flex-col gap-6">
        <nav className="flex flex-col gap-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-surface-500">
            Bot Menu
          </div>
          {botItems.map(({ label, icon: Icon, path, exact }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname.startsWith(path)

            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'ui-nav-link group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive && 'ui-nav-link-active',
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors shrink-0',
                    isActive ? 'text-blurple-400' : 'text-surface-500 group-hover:text-surface-300',
                  )}
                />
                {label}
                {isActive && (
                  <div className="ui-pulse-dot ml-auto w-1.5 h-1.5 rounded-full animate-pulse-soft" />
                )}
              </Link>
            )
          })}
        </nav>

      </div>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col w-60 min-w-[240px]',
        'border-r ui-sidebar-nav',
        className,
      )}
    >
      {/* Server/Bot name header */}
      <div className="flex items-center h-14 px-4 border-b border-surface-800/50 shrink-0">
        <h2 className="text-base font-semibold text-surface-100 truncate">
          {botId && bot ? bot.name : 'Fragment'}
        </h2>
        <ChevronRight className="w-4 h-4 text-surface-500 ml-auto" />
      </div>

      {/* Navigation links */}
      <ScrollArea className="flex-1 px-2 py-3">
        {botId ? renderBotNavigation() : renderGeneralNavigation()}
      </ScrollArea>

      {/* Footer info */}
      <div className="px-3 py-3 border-t border-surface-800/50">
        <p className="text-[10px] text-surface-600 uppercase tracking-wider font-medium">Fragment v1.0.0</p>
      </div>
    </aside>
  )
}
