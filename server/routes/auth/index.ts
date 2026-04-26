import { router } from '@/trpc.js'
import { discordExchange } from './discordExchange.js'
import { login } from './login.js'
import { logout } from './logout.js'
import { refresh } from './refresh.js'
import { signup } from './signup.js'

export const authRouter = router({
  login,
  signup,
  logout,
  refresh,
  discordExchange,
})
