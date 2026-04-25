import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { httpBatchLink, httpLink, splitLink } from '@trpc/client'
import { getSessionAccessToken } from '@/lib/sessionAccessToken'
import { trpc } from '@/lib/trpc'

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  return 'http://localhost:3500'
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  const [trpcClient] = useState(() => {
    const url = `${getBaseUrl()}/trpc`
    const headers = () => {
      const token = typeof window !== 'undefined' ? getSessionAccessToken() : null
      return token ? { Authorization: `Bearer ${token}` } : {}
    }
    const credentialedFetch: typeof fetch = (input, init) =>
      fetch(input, { ...init, credentials: 'include' })

    return trpc.createClient({
      links: [
        splitLink({
          // Código OAuth é uso único: nunca misturar com batch (várias cópias no mesmo POST).
          condition: (op) => {
            const p = Array.isArray(op.path) ? op.path.join('.') : String(op.path)
            return p !== 'auth.discordExchange'
          },
          true: httpBatchLink({ url, headers, fetch: credentialedFetch }),
          false: httpLink({ url, headers, fetch: credentialedFetch }),
        }),
      ],
    })
  })

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools buttonPosition={'top-right'} initialIsOpen={false} />
      </QueryClientProvider>
    </trpc.Provider>
  )
}
