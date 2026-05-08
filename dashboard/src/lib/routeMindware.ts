import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

const DISCORD_CALLBACK_PATH = '/login/discord/callback'

function getAuthSnapshot() {
  return useAuthStore.getState()
}

export function redirectToRootIfUnauthenticated() {
  const { isAuthenticated } = getAuthSnapshot()

  if (!isAuthenticated) {
    throw redirect({ to: '/', replace: true })
  }
}

export function redirectToDashboardIfAuthenticated() {
  const { isAuthenticated } = getAuthSnapshot()

  if (isAuthenticated) {
    throw redirect({ to: '/dashboard', replace: true })
  }
}

export function redirectFromLoginPath({ location }: { location: { pathname: string } }) {
  const { isAuthenticated } = getAuthSnapshot()

  if (isAuthenticated) {
    throw redirect({ to: '/dashboard', replace: true })
  }

  if (location.pathname === DISCORD_CALLBACK_PATH) {
    return
  }

  throw redirect({ to: '/', replace: true })
}
