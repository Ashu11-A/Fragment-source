import { Column, CreateDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from 'typeorm'
import { Bot } from '@/database/entity/Bot.js'
import { Release } from '@/database/entity/Release.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { BaseEntity } from './base'

@Entity({ name: 'plugins' })
export class Plugin extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name!: string
  @Column({ type: 'float' })
  price!: number

  @OneToMany(() => Release, (metadata) => metadata.plugin)
  releases!: Relation<Release[]>
  @ManyToMany(() => Subscription, (subscription) => subscription.plugins)
  subscriptions!: Relation<Subscription[]>

  @ManyToMany(() => Bot, (bot) => bot.plugins)
  bots!: Relation<Bot[]>
}