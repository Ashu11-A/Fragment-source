import { BaseEntity, Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import Config from "./Config.entry";
import Staff from "./Staff.entry";

@Entity({ name: 'guild_utils' })
export default class Guild extends BaseEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ type: 'text' })
    guildId!: string

  @OneToOne(() => Config, (config) => config.guild, { cascade: true })
  @JoinColumn()
    config!: Config

  @OneToMany(() => Staff, (staff) => staff.guild, { cascade: true })
    staff!: Staff[]
}