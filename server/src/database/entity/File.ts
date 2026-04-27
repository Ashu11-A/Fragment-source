import { Release } from '@/database/entity/Release.js'
import type { FileMetadata, FileType } from 'storage'
import { Column, Entity, OneToOne, type Relation } from 'typeorm'
import { BaseEntity } from './base'


@Entity({ name: 'files' })
export class FileEntity extends BaseEntity implements FileMetadata {
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