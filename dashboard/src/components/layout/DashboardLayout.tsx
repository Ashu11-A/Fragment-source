import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBot } from '@/hooks/useBots'
import { useNavBar } from '@/hooks/useNavBar'
import { DashboardRailSidebar } from './DashboardRailSidebar'
import { DashboardMainSidebar } from './DashboardMainSidebar'
import { DashboardNavBar } from './DashboardNavBar'
import { NavBarProvider } from './NavBarProvider'

function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname })
}

export function DashboardLayout() {
  return (
    <NavBarProvider>
      <DashboardLayoutContent />
    </NavBarProvider>
  )
}

function DashboardLayoutContent() {
  const path = useActivePath()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { bots, statuses } = useBot('list')
  const { resetNavBar } = useNavBar()

  const isAdmin = user?.role === 'administrator'

  useEffect(() => {
    resetNavBar()
  }, [path, resetNavBar])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <DashboardRailSidebar path={path} bots={bots} statuses={statuses} />
      <DashboardMainSidebar
        collapsed={collapsed}
        onCollapse={() => setCollapsed(true)}
        path={path}
        isAdmin={isAdmin}
        user={user}
        onLogout={() => void logout()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardNavBar collapsed={collapsed} onExpand={() => setCollapsed(false)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
