import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, OneToMany, type Relation, OneToOne, JoinColumn } from 'typeorm'
import Template from './Template.entry'
import Ticket from './Ticket.entry'
import Config from './Config.entry'

@Entity('guilds')
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