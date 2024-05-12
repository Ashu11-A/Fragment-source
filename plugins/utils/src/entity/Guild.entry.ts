import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import Config from "./Config.entry";

@Entity({ name: 'guild' })
export default class Guild extends BaseEntity {
    @PrimaryColumn()
      id!: string

    @OneToOne(() => Config, { cascade: true })
    @JoinColumn()
      config!: Config
}