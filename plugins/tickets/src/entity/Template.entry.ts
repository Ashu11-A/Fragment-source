import { APIEmbed } from "discord.js";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

interface Properties {
    [key: string]: boolean | string
}

export enum TypeTemplate {
  Button = 'button',
  Select = 'select',
  Modal = 'modal'
}

@Entity({ name: 'tickets_templates' })
export default class Template extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

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

    @Column('json', {
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

    @Column('json', {
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