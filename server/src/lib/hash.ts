import { createHash } from 'crypto'

export const sha256 = (data: Buffer<ArrayBufferLike> | string) => createHash('sha256').update(data).digest('hex')
