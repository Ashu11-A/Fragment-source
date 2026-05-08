import { router } from '@/trpc.js'
import { discordExchangeProcedure } from './discordExchange.js'
import { loginProcedure } from './login.js'
import { logoutProcedure } from './logout.js'
import { logoutAllProcedure } from './logoutAll.js'
import { refreshProcedure } from './refresh.js'
import { sessionsProcedure } from './sessions.js'
import { signupProcedure } from './signup.js'

export const authRouter = router({
  discordExchange: discordExchangeProcedure,
  login: loginProcedure,
  logout: logoutProcedure,
  logoutAll: logoutAllProcedure,
  refresh: refreshProcedure,
  sessions: sessionsProcedure,
  signup: signupProcedure,
})
