import { BaseEntity, PrimaryGeneratedColumn, Column, OneToOne, Entity } from "typeorm"
import Ticket from "./Ticket.entry"

@Entity({ name: 'claim' })
export default class Claim extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @OneToOne(() => Ticket, (ticket) => ticket.claim)
      ticket!: Ticket

    @Column({ type: 'text' })
      channelId!: string
    @Column({ type: 'text' })
      messageId!: string
}