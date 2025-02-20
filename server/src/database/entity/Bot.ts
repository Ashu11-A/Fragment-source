import { nanoid } from 'nanoid'
import { BaseEntity, BeforeInsert, Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm'
import { Plugin } from './Plugin.js'
import { Subscription } from './Subscription.js'
import { User } from './User.js'

@Entity({ name: 'bots' })
export class Bot extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
    id!: number
  @Column({ type: 'uuid' })
    uuid!: string

  @Column({ type: 'varchar', length: 256 })
    name!: string
  @Column({ type: 'boolean' })
    enabled!: boolean

  @ManyToOne(() => User, (user) => user.bots)
    user!: Relation<User>
  @ManyToMany(() => Plugin, (plugin) => plugin.bots)
  @JoinTable()
    plugins!: Relation<Plugin[]>
  @OneToMany(() => Subscription, (subscription) => subscription.bot)
    subscriptions!: Relation<Subscription[]>

  @UpdateDateColumn()
    updatedAt!: string
  @CreateDateColumn()
    createdAt!: Date

  @BeforeInsert()
  generateUUID() {
    if (!this.uuid) this.uuid = nanoid()
  }
}