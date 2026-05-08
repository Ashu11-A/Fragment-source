import { redirectToRootIfUnauthenticated } from '@/lib/routeMindware'

export function requireAuth() {
  redirectToRootIfUnauthenticated()
}
