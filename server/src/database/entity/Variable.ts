import { Bot } from '@/database/entity/Bot.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Column, Entity, ManyToOne, type Relation } from 'typeorm'
import { BaseEntity } from './base'

@Entity({ name: 'variables' })
export class Variable extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
    name!: string
  @Column({ type: 'text' })
    value!: string

  @ManyToOne(() => Bot, (bot) => bot.variables, { onDelete: 'CASCADE' })
    bot!: Relation<Bot>
  @ManyToOne(() => Plugin, (plugin) => plugin.variables, { onDelete: 'CASCADE' })
    plugin!: Relation<Plugin>
}
