import { Bot } from '@/database/entity/Bot.js'
import { Column, Entity, Index, ManyToOne, type Relation } from 'typeorm'
import { BaseEntity } from './base'

@Entity({ name: 'activity_logs' })
@Index(['level'])
@Index(['category'])
@Index(['bot', 'createdAt'])
export class Log extends BaseEntity {
  @Column({ type: 'varchar', length: 16 })
    level!: string
  @Column({ type: 'varchar', length: 64 })
    category!: string
  @Column({ type: 'text' })
    message!: string
  @Column({ type: 'varchar', length: 16 })
    display!: 'success' | 'info' | 'error'
  @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, unknown> | null
  @Column({ type: 'varchar', length: 128, nullable: true })
    source!: string | null

  @ManyToOne(() => Bot, (bot) => bot.logs, { onDelete: 'CASCADE' })
    bot!: Relation<Bot>
}
