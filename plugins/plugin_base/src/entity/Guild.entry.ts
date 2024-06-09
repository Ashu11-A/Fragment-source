import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import Config from "./Config.entry";

@Entity({ name: 'guild_base' })
export default class Guild extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ type: 'text' })
    guildId!: string
  
  @OneToOne(() => Config, (config) => config.guild)
  @JoinColumn()
    config!: Config
}