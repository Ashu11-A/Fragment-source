import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm'
import { Plugin } from './Plugin.js'

@Entity({ name: 'metadatas' })
export class Metadata extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
    id!: number

  @Column({ type: 'varchar', length: 128 })
    name!: string
  @Column({ type: 'varchar', length: 32 })
    version!: string
  @Column({ type: 'text' })
    md5!: string
  @Column({ type: 'text' })
    sha265!: string
  @Column({ type: 'int8' })
    size!: number

  @ManyToOne(() => Plugin, (plugin) => plugin.metadatas)
    plugin!: Relation<Plugin>
  
  @UpdateDateColumn()
    updatedAt!: Date
  @CreateDateColumn()
    createdAt!: Date
}