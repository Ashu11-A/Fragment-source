import { BaseEntity, Column, Entity, OneToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm'
import Ticket from './Ticket.entry'

@Entity('claims')
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