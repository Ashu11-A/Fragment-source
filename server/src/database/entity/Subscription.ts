import { BaseEntity, Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm'
import { User } from './User.js'
import { Plugin } from './Plugin.js'
import { Bot } from './Bot.js'

@Entity({ name: 'subscriptions' })
export class Subscription extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
    id!: number

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
  @CreateDateColumn()
    createAt!: string
  @UpdateDateColumn()
    updateAt!: string
}