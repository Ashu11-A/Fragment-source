import { BaseEntity, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: 'guild_base' })
export default class Guild extends BaseEntity {
    @PrimaryColumn()
      id!: string
}