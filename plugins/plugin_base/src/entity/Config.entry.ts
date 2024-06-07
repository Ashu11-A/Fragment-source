import { BaseEntity, Entity, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import Guild from "./Guild.entry";

@Entity({ name: 'base_config' })
export default class Config extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @OneToOne(() => Guild, (guild) => guild.config)
      guild!: Guild
}