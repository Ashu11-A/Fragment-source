import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm'
import Config from './Config.entry.js'

@Entity({ name: 'guild_base' })
export default class Guild extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ type: 'text' })
    guildId!: string

  @OneToOne(() => Config, (config) => config.guild)
  @JoinColumn()
    config!: Relation<Config>
}