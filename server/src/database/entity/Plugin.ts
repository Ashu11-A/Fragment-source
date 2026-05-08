import { Bot } from '@/database/entity/Bot.js'
import { Variable } from '@/database/entity/Variable'
import { File } from '@/database/entity/File.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { PluginSale } from '@/database/entity/PluginSale.js'
import { User } from '@/database/entity/User.js'
import { Money } from '@/database/hooks/money.js'
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, type Relation } from 'typeorm'
import { BaseEntity } from './base'

@Entity({ name: 'plugins' })
export class Plugin extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
    name!: string
  @Money()
    price!: number
  @Column({ type: 'text', nullable: true })
    description!: string | null
  @Column({ type: 'text', nullable: true })
    readme!: string | null
  @Column({ type: 'boolean', default: false })
    published!: boolean

  @OneToOne(() => File, { nullable: true, cascade: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn()
    icon!: Relation<File | null>

  @OneToMany(() => PluginRelease, (pluginRelease) => pluginRelease.plugin)
    releases!: Relation<PluginRelease[]>
  @OneToMany(() => PluginSale, (sale) => sale.plugin)
    sales!: Relation<PluginSale[]>
  @ManyToMany(() => Bot, (bot) => bot.plugins)
    bots!: Relation<Bot[]>
  @OneToMany(() => Variable, (variable) => variable.plugin)
    variables!: Relation<Variable[]>
  @ManyToOne(() => User, (user) => user.plugins)
    creator!: Relation<User>
}
