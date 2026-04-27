import type { CronExpression } from 'cron-parser'

export interface CronsConfigurations<Metadata = undefined> {
  name: string
  cron: string
  exec(cron: CronsConfigurations<Metadata>, interval: CronExpression): void
  metadata?: Metadata
  once?: boolean
}

export interface UniqueCron<MetaArgs> {
  name: string
  cron: string
  exec(cron: UniqueCron<MetaArgs>): void
  metadata?: MetaArgs
}

export interface CronsConfigurationsSystem<Metadata> extends CronsConfigurations<Metadata> {
  uuid: string
}
