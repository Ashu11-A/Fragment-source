import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

/** Full-screen auth loading */
function AuthLoader() {
  return (
    <div className="ui-app-screen flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blurple-400 animate-spin" />
        <span className="text-sm text-surface-400">Loading...</span>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const state = useAuthStore.getState()

    // Only let through if there's a persisted session still being verified.
    // Unauthenticated users (no localStorage data) also start with isLoading=true,
    // so we must check isAuthenticated too before granting passage.
    if (state.isLoading && state.isAuthenticated) return

    if (!state.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isLoading, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  // beforeLoad won't re-run when Zustand state changes, so we handle the
  // post-verification redirect here: once loading resolves and the session
  // turns out to be invalid, navigate to /login.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: '/login', replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading || !isAuthenticated) return <AuthLoader />

  return <DashboardLayout />
}
