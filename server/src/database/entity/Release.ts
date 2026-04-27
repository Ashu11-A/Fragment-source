import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm'
import { FileEntity } from '@/database/entity/File.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { BaseEntity } from './base'

@Entity({ name: 'releases' })
export class Release extends BaseEntity {
  @Column({ type: 'varchar', length: 128 })
  name!: string
  @Column({ type: 'varchar', length: 32 })
  version!: string
  @Column({ type: 'boolean', default: true })
  latest!: boolean

  @ManyToOne(() => Plugin, (plugin) => plugin.releases)
  plugin!: Relation<Plugin>
  @OneToOne(() => FileEntity, (file) => file.release, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  file!: Relation<FileEntity>
}