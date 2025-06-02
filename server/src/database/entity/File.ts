import { BaseEntity, Column, Entity, Generated, OneToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm'
import { Release } from './Release.js'
import type { FileMetadata, FileType } from 'storage'


@Entity({ name: 'files' })
export class FileEntity extends BaseEntity implements FileMetadata {
  @PrimaryGeneratedColumn()
    id!: number
  @Column({ type: 'varchar', nullable: true })
  @Generated('uuid')
    uuid!: string

  @Column({ type: 'varchar' })
    name!: string
  @Column({ type: 'integer' })
    size!: number
  @Column({ type: 'varchar' })
    type!: FileType
  @Column({ type: 'varchar' })
    mimeType!: string
  @Column({ type: 'text' })
    md5!: string
  @Column({ type: 'text' })
    sha265!: string

  @OneToOne(() => Release, (release) => release.file, { onDelete: 'CASCADE' })
    release!: Relation<Release>
}