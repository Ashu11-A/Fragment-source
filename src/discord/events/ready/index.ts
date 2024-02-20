import { Event } from '@/discord/base'
import moduleExpress from '@/express/express'
import { StructuralCrons } from '@/structural/Crons'
// import { telegramNotify } from './telegram'

export default new Event({
  name: 'ready',
  async run () {
    /**
     * Cron Starter
     */
    await StructuralCrons()
    await moduleExpress()
    // await telegramNotify()
  }
})
