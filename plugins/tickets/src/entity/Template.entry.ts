import { APIEmbed } from "discord.js";
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import Guild from "./Guild.entry";

interface Properties {
    [key: string]: boolean | string
}

export enum TypeTemplate {
  Button = 'button',
  Select = 'select',
  Modal = 'modal'
}

interface Select {
  title: string
  description: string
  emoji: string
}

interface Category {
  title: string
  emoji: string
}

@Entity({ name: 'tickets_templates' })
export default class Template extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @ManyToOne(() => Guild, (guild) => guild.templates)
      guild!: Guild

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
}