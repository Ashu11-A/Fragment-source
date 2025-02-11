import { BaseEntity, Column, CreateDateColumn, Entity, Generated, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, type Relation } from 'typeorm'
import { Bot } from './Bot.js'
import { Metadata } from './Metadata.js'

@Entity({ name: 'plugins' })
export class Plugin extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
    id!: number
  @Generated('uuid')
    uuid!: string
  
  @Column({ type: 'varchar', length: 256 })
    name!: string
  @Column({ type: 'float' })
    price!: number
  @Column({ type: 'boolean' })
    enabled!: boolean

  @OneToMany(() => Metadata, (metadata) => metadata.plugin)
    metadatas!: Relation<Metadata[]>

  @ManyToMany(() => Bot, (bot) => bot.plugins)
    bots!: Relation<Bot[]>
  @Column({ type: 'date' })
    expireAt!: string
  @UpdateDateColumn()
    updatedAt!: string
  @CreateDateColumn()
    createdAt!: Date
}