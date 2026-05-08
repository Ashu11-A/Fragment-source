import { Column, Entity, ManyToOne, type Relation } from 'typeorm'
import { User } from '@/database/entity/User.js'
import { BaseEntity } from './base'
import { Bot } from './Bot'

@Entity({ name: 'user_sessions' })
export class Session extends BaseEntity {
  @Column({ type: 'text' })
    refreshToken!: string
  @Column({ type: 'text' })
    accessToken!: string
  @Column({ type: 'boolean', default: true })
    valid!: boolean
  @Column({ type: 'varchar', length: 255, nullable: true })
    deviceName!: string | null

  @ManyToOne(() => Bot, (bot) => bot.sessions, { onDelete: 'CASCADE' })
    bot!: Relation<Bot>
  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
    user!: Relation<User>

  @Column({ type: 'datetime' })
    expiresAt!: Date
}
