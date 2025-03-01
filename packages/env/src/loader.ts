import { isPKG } from 'utils'
import { Env } from './controllers/Env'
import { Generator } from './controllers/Generator'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

if (!isPKG(dirname(fileURLToPath(import.meta.url)))) {
  const values = new Env({ cwd: process.cwd() }).loader()
  new Generator({ values })
}
