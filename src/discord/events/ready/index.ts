import { Event } from '@/discord/base'
import moduleExpress from '@/express/express'
import { StructuralCrons } from '@/structural/Crons'
// import { telegramNotify } from './telegram'

export default new Event({
  name: 'ready',
  async run () {
    await moduleExpress()
    // await telegramNotify()
  }
})
