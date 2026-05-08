import { Column, Entity, OneToMany, type Relation } from 'typeorm'
import { BaseEntity } from './base'
import { Bot } from './Bot.js'

@Entity({ name: 'nodes' })
export class Node extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
	  name!: string
  @Column({ type: 'text', nullable: true })
	  description!: string | null
  @Column({ type: 'varchar', length: 512, default: '' })
	  token!: string
  @Column({ type: 'boolean', default: false })
    maintenance!: boolean
  @Column({ type: 'varchar', length: 50, default: 'Brazil' })
  	location!: string

  @Column({ type: 'int', default: 0 })
  	memory!: number
  @Column({ type: 'int', default: 0 })
	  memoryOverAllocationPercentage!: number
  @Column({ type: 'int', default: 0 })
	  disk!: number
  @Column({ type: 'int', default: 0 })
	  diskOverAllocationPercentage!: number

  @OneToMany(() => Bot, (bot) => bot.node)
	  bots!: Relation<Bot[]>
}
