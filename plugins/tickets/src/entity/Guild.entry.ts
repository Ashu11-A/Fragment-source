import { BaseEntity, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import Ticket from "./Ticket.entry";
import Config from "./Config.entry";

@Entity({ name: 'guild_tickets' })
export default class Guild extends BaseEntity {
    @PrimaryColumn()
      id!: string

    @OneToMany(() => Ticket, (ticket) => ticket.guild, { cascade: true })
      tickets!: Ticket[]

    @OneToOne(() => Config, (config) => config.guild, { cascade: true })
    @JoinColumn()
      configs!: Config
}