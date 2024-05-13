import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import Guild from "./Guild.entry"

@Entity()
export default class Staff extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number
    
    @ManyToOne(() => Guild, (guild) => guild.staff)
        guild!: Guild

    @Column()
        userId!: string

    @Column()
        userName!: string

    @Column()
        role!: string
}