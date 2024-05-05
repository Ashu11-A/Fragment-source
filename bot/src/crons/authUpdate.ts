import { core } from '@/app'
import { Crons } from '@/classes/Crons'
import { PaymentBot } from '@/classes/PaymentBot'
import { getSettings } from '@/functions/getSettings'

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
  const PaymentAuth = new PaymentBot({ url: 'http://node.seventyhost.net:24398' })
  if (
    Auth?.email === undefined || Auth?.email === '' ||
    Auth.password === undefined || Auth?.password === '' ||
    Auth.uuid === undefined || Auth?.uuid === ''
  ) {
    core.warn('Sistema de autenticação não configurado')
    PaymentAuth.save({
      expired: true,
      enabled: false
    })
    return
  }
  await PaymentAuth.login({ email: Auth.email, password: Auth.password })
  await PaymentAuth.validate({ uuid: Auth.uuid })
}
