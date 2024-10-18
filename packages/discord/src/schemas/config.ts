import { BaseEntity, OneToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm'
import Guild from './guild'

export class ConfigEntry extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @OneToOne(() => Guild, (guid) => guid.configs)
    guild!: Relation<Guild>
}