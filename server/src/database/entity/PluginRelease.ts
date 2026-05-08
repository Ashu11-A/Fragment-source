import { File } from '@/database/entity/File.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { User } from '@/database/entity/User.js'
import { RequestStatus } from '@/database/enums.js'
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, type Relation } from 'typeorm'
import { BaseEntity } from './base'

export type PluginEnvVarDefinition = {
  name: string
  description: string
  required?: boolean
  default?: string
  type?: 'string' | 'number' | 'boolean' | 'secret'
}

@Entity({ name: 'plugin_releases' })
@Index(['status'])
@Index(['reviewedAt'])
@Index(['creator', 'status'])
export class PluginRelease extends BaseEntity {
  @Column({ type: 'varchar', length: 16, default: RequestStatus.Pending })
    status!: RequestStatus

  @Column({ type: 'text', nullable: true })
    reviewNotes!: string | null
  @Column({ type: 'varchar', length: 256 })
    name!: string
  @Column({ type: 'text' })
    description!: string
  @Column({ type: 'text', nullable: true })
    updates!: string | null
  @Column({ type: 'text', nullable: true })
    readme!: string | null
  @Column({ type: 'varchar', length: 64, default: '1.0.0' })
    version!: string
  @Column({ type: 'varchar', length: 64, default: '^1.0.0' })
    minReleaseVersion!: string

  @Column({ type: 'json', nullable: true })
    envs!: PluginEnvVarDefinition[] | null

  @OneToOne(() => File)
  @JoinColumn()
    file!: Relation<File>
  @ManyToOne(() => Plugin, (plugin) => plugin.releases)
    plugin!: Relation<Plugin>
  @ManyToOne(() => User, (user) => user.pluginReleases, { onDelete: 'CASCADE' })
    creator!: Relation<User>
  @ManyToOne(() => User, (user) => user.reviewedPluginReleases, { nullable: true, onDelete: 'SET NULL' })
    reviewer!: Relation<User | null>

  @Column({ type: 'datetime', nullable: true })
    reviewedAt!: Date | null
}
