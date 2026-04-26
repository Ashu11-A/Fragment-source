import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from 'server'

const API_URL = 'http://0.0.0.0:3500'

const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${API_URL}/trpc` })],
})

const res = await trpc.auth.login.mutate({ email: 'admin@admin.com', password: 'admin1234' })
console.log(res)
