import { BaseEntity, Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import Guild from "./Guild.entry.js";

@Entity({ name: 'config_utils' })
export default class Config extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @OneToOne(() => Guild, (guild) => guild.config)
      guild!: Guild

    @Column({ nullable: true })
      logBanKick!: string

    @Column({ nullable: true })
      logEntry!: string

    @Column({ nullable: true })
      logs!: string

    @Column({ nullable: true })
      logExit!: string

    @Column({ nullable: true })
      logStaff!: string
}