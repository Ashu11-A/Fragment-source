import { existsSync } from 'fs'
import { rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { isPKG } from 'utils'

const path = dirname(fileURLToPath(import.meta.url))

if (!isPKG(path)) {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
  const filePath = join(path, 'register.ts')

  if (existsSync(filePath)) await rm(filePath)
  await writeFile(filePath, '')
}