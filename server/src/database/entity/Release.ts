import { Column, Entity, JoinColumn, OneToMany, OneToOne, type Relation } from 'typeorm'
import { Bot } from '@/database/entity/Bot.js'
import { File } from '@/database/entity/File.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { BaseEntity } from './base'

@Entity({ name: 'releases' })
export class Release extends BaseEntity {
  @Column({ type: 'varchar', length: 32 })
	  version!: string
  @Column({ type: 'boolean', default: true })
	  latest!: boolean

  @OneToOne(() => File)
	@JoinColumn()
	  file!: Relation<File>
  @OneToMany(() => Plugin, (plugin) => plugin.releases)
	  plugins!: Relation<Plugin[]>
  @OneToMany(() => Bot, (bot) => bot.release)
	  bots!: Relation<Bot[]>
}
