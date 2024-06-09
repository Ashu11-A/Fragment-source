import { BaseEntity, Column, Entity, OneToOne, PrimaryGeneratedColumn, Relation } from "typeorm";
import Guild from "./Guild.entry.js";

export interface Roles {
    id: string
    name: string
} 

@Entity({ name: 'config_tickets' })
export default class Config extends BaseEntity {
    @PrimaryGeneratedColumn()
      id!: number

    @OneToOne(() => Guild, (guid) => guid.configs)
      guild!: Relation<Guild>

    @Column({ type: 'decimal', precision: 3, nullable: true })
      claimLimit?: number

    @Column({ type: 'decimal', precision: 3, nullable: true })
      limit?: number

    @Column({ type: 'varchar', nullable: true })
      claimId?: string

    @Column({ type: 'varchar', nullable: true })
      logsId?: string
    
    @Column({
      type: 'json',
      nullable: true, transformer: {
        to(value: Roles[]): string {
          return JSON.stringify(value);
        },
        from(value: string): Roles[] {
          return JSON.parse(value);
        },
      }, })
      roles?: Roles[]
}