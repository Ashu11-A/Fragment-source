import { Column, Entity } from 'typeorm'
import type { FileType } from 'storage'
import { BaseEntity } from './base'

@Entity({ name: 'files' })
export class File extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
	  name!: string
  @Column({ type: 'integer' })
	  size!: number
  @Column({ type: 'varchar', length: 64 })
	  type!: FileType
  @Column({ type: 'varchar', length: 255 })
	  mimeType!: string
  @Column({ type: 'text' })
	  sha256!: string
}
