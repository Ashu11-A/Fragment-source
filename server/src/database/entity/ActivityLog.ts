import {
  Column,
  Entity,
  Index
} from 'typeorm'
import { BaseEntity } from './base'

@Entity({ name: 'activity_logs' })
@Index(['botId', 'createdAt'])
export class ActivityLog extends BaseEntity {
  @Column({ type: 'int' })
  botId!: number
  @Column({ type: 'varchar', length: 64, nullable: true })
  correlationId!: string | null


  @Column({ type: 'varchar', length: 16 })
  level!: string
  @Column({ type: 'varchar', length: 64 })
  category!: string
  @Column({ type: 'text' })
  message!: string
  /** Normalized for dashboard filters (success / info / error) */
  @Column({ type: 'varchar', length: 16 })
  display!: 'success' | 'info' | 'error'
  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null
  @Column({ type: 'varchar', length: 128, nullable: true })
  source!: string | null
}
