import { core } from '@/app'
import { Crons } from '@/classes/Crons'
import { PaymentBot } from '@/classes/PaymentBot'
import getSettings from '@/functions/getSettings'
import internalDB from '@/settings/settings.json'

new Crons({
  name: 'Auth - Start',
  cron: '* * * * * *',
  once: true,
  async exec (cron, interval) {
    if (interval === undefined) return
    await authUpdate()
  }
})

new Crons({
  name: 'Auth',
  cron: '0 */1 * ? * *',
  once: false,
  async exec (cron, interval) {
    if (interval === undefined) return
    await authUpdate()
  }
})

async function authUpdate (): Promise<void> {
  const { Auth } = getSettings()
  if (Auth?.email === undefined || Auth.password === undefined || Auth.uuid === undefined) { core.warn('Sistema de autenticação não configurado'); return }
  const PaymentAuth = new PaymentBot({ url: internalDB.API })

  await PaymentAuth.login({ email: Auth.email, password: Auth.password })
  await PaymentAuth.validate({ uuid: Auth.uuid })
}
