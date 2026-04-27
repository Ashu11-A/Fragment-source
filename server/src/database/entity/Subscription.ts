import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm'
import { User } from '@/database/entity/User.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Bot } from '@/database/entity/Bot.js'
import { BaseEntity } from './base'

@Entity({ name: 'subscriptions' })
export class Subscription extends BaseEntity {
  @Column({ type: 'boolean', default: true })
  active!: boolean

  @ManyToOne(() => User, (user) => user.subscriptions)
  user!: Relation<User>
  @ManyToOne(() => Bot, (bot) => bot.subscriptions)
  bot!: Relation<User>
  @ManyToMany(() => Plugin, (plugin) => plugin.subscriptions)
  @JoinTable()
  plugins!: Relation<Plugin[]>

  @Column({ type: 'date' })
  startAt!: string
  @Column({ type: 'date' })
  expireAt!: string
}