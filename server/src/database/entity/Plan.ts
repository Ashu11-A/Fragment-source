import { Money } from '@/database/hooks/money.js'
import { Column, Entity, OneToMany, type Relation } from 'typeorm'
import { BaseEntity } from './base'
import { Subscription } from './Subscription'

@Entity({ name: 'plans' })
export class Plan extends BaseEntity {
  @Column({ type: 'varchar', length: 32, unique: true })
	  key!: string

  @Column({ type: 'varchar', length: 128 })
	  name!: string
  @Column({ type: 'text' })
	  description!: string
  @Column({ type: 'boolean', default: true })
	  active!: boolean
  @Column({ type: 'varchar', length: 32 })
	  tier!: string

  @Money()
	  monthlyPriceUsd!: number

  @Column({ type: 'int' })
	  memory!: number
  @Column({ type: 'int' })
	  cpu!: number

  @Column({ type: 'int', default: 1 })
	  maxBots!: number
  @Column({ type: 'int', default: 3 })
	  maxPlugins!: number
  @Column({ type: 'varchar', length: 32, default: 'community' })
	  supportLevel!: string
  @Column({ type: 'simple-json' })
	  highlights!: string[]

  @OneToMany(() => Subscription, (subscription) => subscription.plan)
    subscriptions!: Relation<Subscription | null>
}
