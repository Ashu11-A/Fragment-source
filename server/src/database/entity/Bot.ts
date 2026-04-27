import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, type Relation, UpdateDateColumn } from 'typeorm'
import { Plugin } from '@/database/entity/Plugin.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { User } from '@/database/entity/User.js'
import { BaseEntity } from './base'

@Entity({ name: 'bots' })
export class Bot extends BaseEntity {
  @Column({ type: 'varchar'/*, length: 256*/ })
  name!: string
  @Column({ type: 'boolean' })
  enabled!: boolean

  @ManyToOne(() => User, (user) => user.bots)
  user!: Relation<User>
  @ManyToMany(() => Plugin, (plugin) => plugin.bots)
  @JoinTable()
  plugins!: Relation<Plugin[]>
  @OneToMany(() => Subscription, (subscription) => subscription.bot)
  subscriptions!: Relation<Subscription[]>

}