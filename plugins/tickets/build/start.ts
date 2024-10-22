import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { rm } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { PKG_MODE } from 'utils'

if (!PKG_MODE) {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
  const filePath = join(path, 'register.ts')

  if (existsSync(filePath)) await rm(filePath)
  await writeFile(filePath, '')
}