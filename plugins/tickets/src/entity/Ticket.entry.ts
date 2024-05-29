import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import Guild from './Guild.entry'

export interface User {
  name: string
  displayName: string
  id: string
}

export interface History {
  role: string
  user: {
    id: string
    name: string
  }
  message: {
    id: string
    content: string
  }
  date: Date
  deleted: boolean
}

export interface Message {
  channelId: string
  messageId: string
}

export interface TicketCategories {
  title: string
  emoji: string
}

export interface Voice {
  id: string
  messageId: string
}

export interface TicketType {
  ownerId: string
  title?: string
  description?: string
  closed: boolean
  channelId: string
  messageId: string
  claim?: Message
  voice?: Voice
  category: TicketCategories
  team: User[]
  users: User[]
  history: History[]
  messages: Message[]
}

@Entity({ name: 'tickets' })
export default class Ticket extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @ManyToOne(() => Guild, (guild) => guild.tickets)
    guild!: Guild

  @Column()
    ownerId!: string
  
  @Column({ nullable: true })
    title!: string

  @Column({ nullable: true })
    description!: string

  @Column({ type: 'boolean', default: false })
    closed!: boolean
  
  @Column()
    channelId!: string

  @Column()
    messageId!: string

  @Column({
    type: 'simple-json',
    nullable: true,
    transformer: {
      to(value: string): string { return JSON.stringify(value) },
      from(value: string): Message { return JSON.parse(value) },
    }
  })
    claim!: Message
  
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
      from(value: string): History[] { return JSON.parse(value) },
    }
  })
    history!: History[]

  @UpdateDateColumn()
    updateAt!: Date
  @CreateDateColumn()
    createAt!: Date
}