import { Plan } from '@/database/entity/Plan.js'
import { User } from '@/database/entity/User.js'
import { Column, Entity, Index, ManyToOne, type Relation } from 'typeorm'
import { BaseEntity } from './base'

@Entity({ name: 'subscriptions' })
@Index(['active'])
@Index(['user', 'active'])
export class Subscription extends BaseEntity {
  @Column({ type: 'boolean', default: true })
	  active!: boolean

  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
	  user!: Relation<User>
  @ManyToOne(() => Plan, (plan) => plan.subscriptions)
	  plan!: Relation<Plan>

  @Column({ type: 'date' })
	  startAt!: Date
  @Column({ type: 'date' })
	  expiresAt!: Date
  @Column({ type: 'date', nullable: true })
	  canceledAt!: Date | null
}
