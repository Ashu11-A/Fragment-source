import { APIEmbed } from "discord.js";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

interface Properties {
    [key: string]: boolean
}

@Entity({ name: 'tickets_templates' })
export default class Template extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @Column({ type: 'text' })
      messageId!: string
    
    @Column({ type: 'text' })
      channelId!: string

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