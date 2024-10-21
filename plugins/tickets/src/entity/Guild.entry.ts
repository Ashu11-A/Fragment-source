import { BaseEntity, Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm'
import Config from './Config.entry.js'
import Template from './Template.entry.js'
import Ticket from './Ticket.entry.js'

@Entity({ name: 'guild_tickets' })
export default class Guild extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ type: 'text' })
    guildId!: string

  @OneToMany(() => Ticket, (ticket) => ticket.guild, { cascade: true })
    tickets!: Relation<Ticket>[]

  @OneToMany(() => Template, (ticket) => ticket.guild)
    templates!: Relation<Template>[]

  @OneToOne(() => Config, (config) => config.guild, { cascade: true })
  @JoinColumn()
    configs!: Relation<Config>
}