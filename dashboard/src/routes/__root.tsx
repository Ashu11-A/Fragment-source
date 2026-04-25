import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TRPCProvider } from '@/providers/TRPCProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AuthProvider } from '@/providers/AuthProvider'

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <TRPCProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </TRPCProvider>
    </ThemeProvider>
  ),
})
