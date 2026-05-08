import cronParser from 'cron-parser'
import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import type { CronsConfigurations, CronsConfigurationsSystem, UniqueCron } from '@/types/crons.js'

export type { CronsConfigurations, CronsConfigurationsSystem, UniqueCron } from '@/types/crons.js'

/**
 * Class representing a collection of cron jobs.
 */
export class Crons<Metadata> {
  /**
   * Array containing all defined cron jobs.
   */
  public static all: Array<CronsConfigurationsSystem<InstanceType<typeof Crons>['data']['metadata']>> = []
  /**
   * EventEmitter used for managing cron job events.
   */
  public static set = new EventEmitter()
  public static timeouts = new Map<string, ReturnType<typeof setTimeout>>()

  /**
   * Starts the specified cron job.
   * @param cron - Configuration for the cron job.
   */
  public static start (cron: CronsConfigurationsSystem<InstanceType<typeof Crons>['data']['metadata']>): void {
    const interval = cronParser.parseExpression(cron.cron)
    const nextScheduledTime = interval.next().getTime()
    const currentTime = Date.now()
    const delay = nextScheduledTime - currentTime

    // Updates the interval and schedules the next execution
    this.timeouts.set(cron.uuid, setTimeout(() => {
      Crons.set.emit(cron.uuid, cron, interval)
      if (!(cron.once ?? false)) Crons.start(cron)
    }, delay))
  }

  /**
   * Configures unique cron jobs that run only once.
   * @return Returns the setTimeout ID, which can be used for cancellation.
   */
  public static once<MetaArgs>(cron: UniqueCron<MetaArgs>): ReturnType<typeof setTimeout> {
    const interval = cronParser.parseExpression(cron.cron)
    const nextScheduledTime = interval.next().getTime()
    const currentTime = Date.now()
    const delay = nextScheduledTime - currentTime

    console.log(`| Unique Cron' - ${cron.name} added successfully.`)

    return setTimeout(() => {
      cron.exec(cron)
    }, delay)
  }

  /**
   * Updates or adds a cron job.
   * @param cron - Configuration for the cron job.
   */
  public static post (cron: CronsConfigurationsSystem<InstanceType<typeof Crons>['data']['metadata']>): void {
    if (cron?.uuid.length > 0) {
      const index = Crons.all.findIndex(c => c.uuid === cron.uuid)
      if (index !== -1) {
        if (cron === Crons.all[index]) return
        Crons.all[index] = cron
        console.log(`Crons - ${cron.name} | updated successfully.`)
      }
    } else {
      // Generates a new UUID if not provided
      const newcron = {
        ...cron,
        uuid: randomUUID().replaceAll('-', '')
      }
      newcron.once = cron.once ?? false
      Crons.all.push(newcron)
      console.log(`Crons - ${cron.name} | added successfully.`)
    }
  }

  /**
   * Generates a cron expression for a specific date.
   * @param date - Expiration date.
   * @returns Returns the cron expression.
   */
  public static date (date: Date): string {
    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    const dayOfMonth = date.getDate()
    let month = date.getMonth() + 1 // Months start from zero in JavaScript
    if (month === 13) {
      month = 12
    }
    return `${seconds} ${minutes} ${hours} ${dayOfMonth} ${month} *`
  }

  /**
   * Constructor for the Crons class.
   * @param data - Configuration for the cron job.
   */
  constructor (public data: CronsConfigurations<Metadata>) {
    const cron = {
      ...data,
      uuid: randomUUID().replaceAll('-', '')
    }
    cron.once = data.once ?? false
    Crons.all.push(cron as CronsConfigurationsSystem<InstanceType<typeof Crons>['data']['metadata']>)
  }

  public static async register () {
    for (const isolated of Crons.all) {
      Crons.set.on(isolated.uuid, isolated.exec)// create Cron Event
      Crons.start(isolated) // Run Cron events
    }
  }
}
