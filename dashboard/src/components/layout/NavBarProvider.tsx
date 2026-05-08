import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  NavBarContext,
  defaultNavBarConfig,
  type NavBarConfig,
  type UseNavBarValue,
} from '@/hooks/useNavBar'

export function NavBarProvider({ children }: { children: ReactNode }) {
  const [navBar, setNavBarState] = useState<NavBarConfig>(defaultNavBarConfig)

  const setNavBar = useCallback((next: Partial<NavBarConfig>) => {
    setNavBarState((current) => ({ ...current, ...next }))
  }, [])

  const setNavBarTitle = useCallback((title?: string) => {
    setNavBar({ title })
  }, [setNavBar])

  const setNavBarSearch = useCallback((next: Partial<Pick<NavBarConfig, 'showSearch' | 'searchPlaceholder'>>) => {
    setNavBar(next)
  }, [setNavBar])

  const setNavBarRightContent = useCallback((content?: ReactNode) => {
    setNavBar({ rightContent: content })
  }, [setNavBar])

  const setNavBarNotifications = useCallback((show: boolean) => {
    setNavBar({ showNotifications: show })
  }, [setNavBar])

  const resetNavBar = useCallback(() => {
    setNavBarState(defaultNavBarConfig)
  }, [])

  const value = useMemo<UseNavBarValue>(() => ({
    navBar,
    setNavBar,
    setNavBarTitle,
    setNavBarSearch,
    setNavBarRightContent,
    setNavBarNotifications,
    resetNavBar,
  }), [navBar, resetNavBar, setNavBar, setNavBarNotifications, setNavBarRightContent, setNavBarSearch, setNavBarTitle])

  return <NavBarContext.Provider value={value}>{children}</NavBarContext.Provider>
}
