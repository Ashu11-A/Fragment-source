import { BaseEntity, Column, JoinColumn, OneToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm'
import { ConfigEntry } from './config'

export default class Guild extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ type: 'text' })
    guildId!: string

  @OneToOne(() => ConfigEntry, (config) => config.guild, { cascade: true })
  @JoinColumn()
    configs!: Relation<ConfigEntry>
}