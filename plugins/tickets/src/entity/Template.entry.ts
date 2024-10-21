import { type APIEmbed } from 'discord.js'
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from 'typeorm'
import Guild from './Guild.entry.js'
import Ticket from './Ticket.entry.js'

export interface Properties {
    [key: string]: boolean | string
}

export enum TypeTemplate {
  Button = 'button',
  Select = 'select',
  Modal = 'modal'
}

export interface Select {
  title: string
  description: string
  emoji: string
}

export interface Category {
  title: string
  emoji: string
}

export interface System {
  name: string
  isEnabled: boolean
}

@Entity({ name: 'tickets_templates' })
export default class Template extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @ManyToOne(() => Guild, (guild) => guild.templates, { cascade: true })
    guild!: Relation<Guild>

  @OneToMany(() => Ticket, (ticket) => ticket.template)
    tickets!: Relation<Template>[]

  @Column({ type: 'text' })
    messageId!: string
  
  @Column({ type: 'text' })
    channelId!: string

  @Column({
    type: 'enum',
    enum: ['button', 'select', 'modal'],
    default: TypeTemplate.Button
  })
    type!: TypeTemplate

  @Column('simple-json', {
    nullable: true,
    transformer: {
      to(value: string): string {
        return JSON.stringify(value)
      },
      from(value: string): Select[] {
        return JSON.parse(value)
      },
    }
  })
    selects!: Select[]

  @Column('simple-json', {
    nullable: true,
    transformer: {
      to(value: string): string {
        return JSON.stringify(value)
      },
      from(value: string): Category[] {
        return JSON.parse(value)
      },
    }
  })
    categories!: Category[]

  @Column('simple-json', {
    nullable: true,
    transformer: {
      to(value: string): string {
        return JSON.stringify(value)
      },
      from(value: string): APIEmbed {
        return JSON.parse(value)
      },
    }
  })
    embed!: APIEmbed

  @Column('simple-json', {
    nullable: true,
    transformer: {
      to(value: string): string {
        return JSON.stringify(value)
      },
      from(value: string): Properties {
        return JSON.parse(value)
      },
    }
  })
    properties!: Properties

  @Column('simple-json', {
    nullable: true,
    transformer: {
      from(value: string): System[] { return JSON.parse(value) },
      to(value: string): string { return JSON.stringify(value) },
    }
  })
    systems!: System[] | null

  @CreateDateColumn()
    createAt!: Date

  @UpdateDateColumn()
    updateAt!: Date
}