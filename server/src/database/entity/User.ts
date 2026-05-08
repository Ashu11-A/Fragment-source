import { Bot } from '@/database/entity/Bot.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { PluginSale } from '@/database/entity/PluginSale.js'
import { Session } from '@/database/entity/Session'
import { Subscription } from '@/database/entity/Subscription.js'
import { Role } from '@/database/enums.js'
import { Hidden } from '@/database/hooks/hidden.js'
import { compare, hash } from 'bcryptjs'
import { Column, Entity, Index, OneToMany, type Relation } from 'typeorm'
import { BaseEntity } from './base'

@Entity({ name: 'users' })
@Index(['username'], { unique: true })
@Index(['email'], { unique: true })
@Index(['discordId'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'text' })
    name!: string
  @Column({ type: 'text' })
    username!: string
  @Column({ type: 'varchar', unique: true })
    email!: string
  @Column({ type: 'varchar' })
    language!: string
  @Hidden({ type: 'text', nullable: true })
    password!: string | null
  @Column({ type: 'varchar', default: Role.User })
    role!: Role

  @Column({ type: 'varchar', nullable: true, unique: true })
    discordId!: string | null
  @Column({ type: 'varchar', nullable: true })
    discordAvatar!: string | null

  @OneToMany(() => Session, (session) => session.user)
    sessions!: Relation<Session[]>
  @OneToMany(() => Bot, (bot) => bot.user)
    bots!: Relation<Bot[]>

  @OneToMany(() => PluginSale, (sale) => sale.seller)
    sales!: Relation<PluginSale[]>
  @OneToMany(() => PluginSale, (sale) => sale.buyer)
    purchases!: Relation<PluginSale[]>
  @OneToMany(() => Subscription, (subscription) => subscription.user)
    subscriptions!: Relation<Subscription[]>

  @OneToMany(() => Plugin, (plugin) => plugin.creator)
    plugins!: Relation<Plugin[]>
  @OneToMany(() => PluginRelease, (pluginRelease) => pluginRelease.creator)
    pluginReleases!: Relation<PluginRelease[]>
  @OneToMany(() => PluginRelease, (pluginRelease) => pluginRelease.reviewer)
    reviewedPluginReleases!: Relation<PluginRelease[]>

  async setPassword(password: string): Promise<User> {
    this.password = await hash(password, 10)
    return this
  }

  async validatePassword(password: string): Promise<boolean> {
    if (this.password == null) return false
    return compare(password, this.password)
  }
}
