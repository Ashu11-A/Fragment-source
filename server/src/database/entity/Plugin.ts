import { BaseEntity, Column, CreateDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from 'typeorm'
import { Bot } from './Bot.js'
import { Release } from './Release.js'
import { Subscription } from './Subscription.js'

@Entity({ name: 'plugins' })
export class Plugin extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
    id!: number
  
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
  @UpdateDateColumn()
    updatedAt!: string
  @CreateDateColumn()
    createdAt!: Date
}