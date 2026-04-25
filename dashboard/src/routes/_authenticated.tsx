import { createFileRoute, redirect } from '@tanstack/react-router'
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
  /**
   * Authenticated layout route — redirects to /login if not authenticated.
   * Uses the zustand store directly (synchronous check) so it works outside
   * of React component scope inside `beforeLoad`.
   */
  beforeLoad: () => {
    const state = useAuthStore.getState()

    // If still loading (initial session validation), we let through and the
    // component will show a loading spinner until AuthProvider resolves.
    if (state.isLoading) return

    if (!state.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isLoading, isAuthenticated } = useAuthStore()

  if (isLoading) return <AuthLoader />
  if (!isAuthenticated) {
    // Fallback — beforeLoad should have caught this, but just in case
    throw redirect({ to: '/login' })
  }

  return <DashboardLayout />
}
