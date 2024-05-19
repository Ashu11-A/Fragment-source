import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import Guild from './Guild.entry'

@Entity({ name: 'tickets' })
export default class Ticket extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @ManyToOne(() => Guild, (guild) => guild.tickets)
    guild!: Guild

  @Column()
    owner!: string
  
  @Column({ nullable: true })
    description!: string

  @Column({ type: 'boolean', default: false })
    closed!: boolean
  
  @Column()
    channelId!: string

  @Column()
    messageId!: string
    // claim?: Claim
    // voice?: {
    //   id: string
    //   messageId: string
    // }
    // users: User[]
    // team: User[]
    // category: TicketCategories
    // messages: Messages[]
    // history: History[]
  @UpdateDateColumn()
    updateAt!: Date
  @CreateDateColumn()
    createAt!: Date
}