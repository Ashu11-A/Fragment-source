import { BaseEntity as TBaseEntity, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

export class BaseEntity extends TBaseEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @UpdateDateColumn()
  updatedAt!: Date
  @CreateDateColumn()
  createdAt!: Date
}