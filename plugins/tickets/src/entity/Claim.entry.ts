import { BaseEntity, PrimaryGeneratedColumn, Column, OneToOne, Entity, type Relation } from 'typeorm'
import Ticket from './Ticket.entry.js'

@Entity({ name: 'claim' })
export default class Claim extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @OneToOne(() => Ticket, (ticket) => ticket.claim)
      ticket!: Relation<Ticket>

    @Column({ type: 'text' })
      channelId!: string
    @Column({ type: 'text' })
      messageId!: string
}