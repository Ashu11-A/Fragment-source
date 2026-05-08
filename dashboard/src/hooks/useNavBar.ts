import { createContext, useContext, type ReactNode } from 'react'

export type NavBarConfig = {
  title?: string
  showSearch: boolean
  searchPlaceholder: string
  showNotifications: boolean
  rightContent?: ReactNode
}

export type UseNavBarValue = {
  navBar: NavBarConfig
  setNavBar: (next: Partial<NavBarConfig>) => void
  setNavBarTitle: (title?: string) => void
  setNavBarSearch: (next: Partial<Pick<NavBarConfig, 'showSearch' | 'searchPlaceholder'>>) => void
  setNavBarRightContent: (content?: ReactNode) => void
  setNavBarNotifications: (show: boolean) => void
  resetNavBar: () => void
}

export const defaultNavBarConfig: NavBarConfig = {
  showSearch: true,
  searchPlaceholder: 'Search bots, plugins, nodes...',
  showNotifications: true,
}

export const NavBarContext = createContext<UseNavBarValue | null>(null)

export function useNavBar() {
  const context = useContext(NavBarContext)
  if (!context) {
    throw new Error('useNavBar must be used within NavBarProvider')
  }
  return context
}
