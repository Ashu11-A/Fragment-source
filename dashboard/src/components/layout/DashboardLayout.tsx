import { useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { GuildSidebar } from '@/components/layout/GuildSidebar'
import { NavSidebar } from '@/components/layout/NavSidebar'
import { TopNavbar } from '@/components/layout/TopNavbar'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Main dashboard layout: Discord-inspired double sidebar + top nav + scrollable content.
 *
 * ┌──────┬─────────────┬─────────────────────────┐
 * │Guild │  NavSidebar  │  TopNavbar              │
 * │ Bar  │             ├─────────────────────────┤
 * │      │             │  Content (scrollable)    │
 * │      │             │                         │
 * └──────┴─────────────┴─────────────────────────┘
 */
export function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Left guild bar — hidden on mobile */}
        <GuildSidebar className="hidden md:flex" />

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="ui-overlay-scrim fixed inset-0 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Navigation sidebar — slide-in on mobile */}
        <NavSidebar
          className={`
            fixed md:relative z-50 md:z-auto
            transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            h-full
          `}
        />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopNavbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

          <ScrollArea className="flex-1">
            <main className="p-4 md:p-6 animate-fade-in">
              <Outlet />
            </main>
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  )
}
