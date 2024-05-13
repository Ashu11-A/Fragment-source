import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import Config from "./Config.entry";
import Staff from "./Staff.entry";

@Entity({ name: 'guild' })
export default class Guild extends BaseEntity {
    @PrimaryColumn()
      id!: string

    @OneToOne(() => Config, { cascade: true })
    @JoinColumn()
      config!: Config

    @OneToMany(() => Staff, (staff) => staff.id)
      staff!: Staff[]
}