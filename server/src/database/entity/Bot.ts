import { BaseEntity, Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm'
import { User } from './User.js'
import { Plugin } from './Plugins.js'

@Entity({ name: 'bots' })
export class Bot extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
    id!: number

  @Column({ type: 'varchar', length: 256 })
    name!: string
  @Column({ type: 'boolean' })
    enabled!: boolean

  @ManyToOne(() => User, (user) => user.bots)
    user!: Relation<User>
  @ManyToMany(() => Plugin, (plugin) => plugin.bots)
    plugins!: Relation<Plugin[]>
    
  @Column({ type: 'date' })
    expireAt!: string
  @UpdateDateColumn()
    updatedAt!: string
  @CreateDateColumn()
    createdAt!: Date
}