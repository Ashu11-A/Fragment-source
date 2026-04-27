import { compare, hash } from 'bcryptjs'
import { Column, CreateDateColumn, Entity, OneToMany, type Relation, UpdateDateColumn } from 'typeorm'
import { Role } from '@/database/enums.js'
import { Hidden } from '@/database/hooks/hidden.js'
import { Auth } from '@/database/entity/Auth.js'
import { Bot } from '@/database/entity/Bot.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { BaseEntity } from './base'

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Column({ type: 'text'/*, length: 64*/ })
    name!: string
  @Column({ type: 'text'/*, length: 64*/ })
    username!: string
  @Column({ type: 'varchar', unique: true })
    email!: string
  @Column({ type: 'varchar'/*, length: 16*/ })
    language!: string
  @Column({ type: 'varchar', nullable: true, unique: true })
    discordId!: string | null
  @Hidden({ type: 'text', nullable: true })
    password!: string | null
  @Column({ type: 'varchar', default: Role.User })
    role!: Role

  @OneToMany(() => Auth, (auth) => auth.user)
    auths!: Relation<Auth[]>
  @OneToMany(() => Bot, (bot) => bot.user)
    bots!: Relation<Bot[]>
  @OneToMany(() => Subscription, (subscription) => subscription.user)
    subscriptions!: Subscription[]

  async setPassword(password: string): Promise<User> {
    this.password = await hash(password, 10)
    return this
  }

  async validatePassword(password: string): Promise<boolean> {
    if (this.password == null) return false
    return compare(password, this.password)
  }
}
