import { BaseEntity, type Relation, ManyToOne, UpdateDateColumn, Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm'
import Claim from './Claim.entry'
import Template from './Template.entry'
import Guild from './Guild.entry'
import type { User, History, Event, Message, TicketCategories, Voice } from '@/types/entities.js'

@Entity('tickets')
export default class Ticket extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @ManyToOne(() => Guild, (guild) => guild.tickets)
    guild!: Relation<Guild>

  @ManyToOne(() => Template, (template) => template.tickets)
    template!: Relation<Template>

  @Column({ type: 'text' })
    ownerId!: string
  
  @Column({ type: 'text', nullable: true })
    title!: string

  @Column({ type: 'text', nullable: true })
    description!: string

  @Column({ type: 'boolean', default: false })
    closed!: boolean
  
  @Column({ type: 'text' })
    channelId!: string

  @Column({ type: 'text' })
    messageId!: string

  @OneToOne(() => Claim, (claim) => claim.ticket)
  @JoinColumn()
    claim!: Relation<Claim>
  
  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): Voice { return JSON.parse(value) },
    }
  })
    voice!: Voice

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): User[] { return JSON.parse(value) },
    }
  })
    users!: User[]

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): User[] { return JSON.parse(value) },
    }
  })
    team!: User[]

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): TicketCategories { return JSON.parse(value) },
    }
  })
    category!: TicketCategories

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): Message[] { return JSON.parse(value) },
    }
  })
    messages!: Message[]

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): Event[] { return JSON.parse(value) },
    }
  })
    events!: Event[]

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): History[] { return JSON.parse(value) },
    }
  })
    history!: History[]

  @UpdateDateColumn()
    updateAt!: Date
  @CreateDateColumn()
    createAt!: Date
}