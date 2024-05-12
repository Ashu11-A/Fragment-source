import { BaseEntity, Column, Entity, JoinColumn, JoinTable, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import Guild from "./Guild.entry";

@Entity({ name: 'config' })
export default class Config extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @OneToOne(() => Guild)
    @JoinColumn()
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