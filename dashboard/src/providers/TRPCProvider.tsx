import { TRPCProvider as TP } from '@/lib/trpc'
import { getSessionAccessToken } from '@/lib/sessionAccessToken'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { ReactNode, useState } from 'react'
import type { AppRouter } from 'server/routes/index'

function getBaseUrl() {
  if (typeof window !== 'undefined') return '/trpc'
  return 'http://localhost:3500/trpc'
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: getBaseUrl(),
          headers() {
            const token = getSessionAccessToken()
            return token ? { authorization: `Bearer ${token}` } : {}
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TP trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TP>
    </QueryClientProvider>
  );
}
