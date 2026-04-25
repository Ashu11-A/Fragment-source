import { type ReactNode, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

/**
 * ThemeProvider now delegates to Zustand's useUIStore.
 * It only syncs the initial DOM class on mount.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  return <>{children}</>
}

/** Convenience hook — same API as before but backed by Zustand */
export function useTheme() {
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const setTheme = useUIStore((s) => s.setTheme)
  return { theme, toggleTheme, setTheme }
}
