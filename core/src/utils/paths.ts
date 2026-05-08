import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { processPath } from 'utils'

export const { isPKG, root } = processPath(dirname(fileURLToPath(import.meta.url)))
