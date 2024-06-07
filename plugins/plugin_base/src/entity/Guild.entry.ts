import { BaseEntity, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import Config from "./Config.entry";

@Entity({ name: 'guild_base' })
export default class Guild extends BaseEntity {
  @PrimaryColumn()
    id!: string
  
  @OneToOne(() => Config, (config) => config.guild)
  @JoinColumn()
    config!: Config
}