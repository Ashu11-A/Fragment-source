import { Plugin } from '@/database/entity/Plugin.js'
import { User } from '@/database/entity/User.js'
import { PluginSaleStatus } from '@/database/enums.js'
import { Money } from '@/database/hooks/money.js'
import { Column, Entity, Index, ManyToOne, type Relation } from 'typeorm'
import { BaseEntity } from './base'

@Entity({ name: 'plugin_sales' })
@Index(['status'])
@Index(['paymentIntentId'])
@Index(['checkoutSessionId'])
@Index(['plugin', 'buyer'])
export class PluginSale extends BaseEntity {
  @Column({ type: 'varchar', length: 16, default: PluginSaleStatus.Pending })
	  status!: PluginSaleStatus
  
  @Money()
	  grossAmount!: number
  @Money()
	  feeAmount!: number
  @Money()
	  sellerAmount!: number
  @Column({ type: 'varchar', length: 8, default: 'usd' })
	  currency!: string

  @Column({ type: 'varchar', length: 128, nullable: true })
	  checkoutSessionId!: string | null
  @Column({ type: 'varchar', length: 128, nullable: true })
	  paymentIntentId!: string | null

  @ManyToOne(() => Plugin, (plugin) => plugin.sales, { onDelete: 'RESTRICT' })
	  plugin!: Relation<Plugin>
  @ManyToOne(() => User, (user) => user.purchases, { onDelete: 'RESTRICT' })
	  buyer!: Relation<User>
  @ManyToOne(() => User, (user) => user.sales, { onDelete: 'RESTRICT' })
	  seller!: Relation<User>

  @Column({ type: 'datetime', nullable: true })
	  paidAt!: Date | null
}
