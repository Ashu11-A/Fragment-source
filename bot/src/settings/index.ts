import dotenv from 'dotenv'
import { existsSync, writeFileSync } from 'fs'
import path, { resolve } from 'path'
import { generate } from 'randomstring'
import { Signale } from 'signale'
import './constants'

const developmentEnvPath = resolve(process.cwd(), '.env.development')
const dev = existsSync(developmentEnvPath)

if (dev) {
  const pathSettings = resolve(path.join(__dirname, 'settings.json'))
  if (!existsSync(pathSettings)) {
    writeFileSync(
      path.join(__dirname, 'settings.json'),
      JSON.stringify({ token: generate(256) }, null)
    )
  }
}

const { parsed: parsedEnv } = dotenv.config({
  path: existsSync(developmentEnvPath)
    ? developmentEnvPath
    : resolve(process.cwd(), '.env')
})
const processEnv = { ...(parsedEnv as NodeJS.ProcessEnv), dev }
const log = new Signale({
  types: {
    successComamnd: { badge: '√', color: 'blue', label: 'Command' },
    successEvent: { badge: '√', color: 'yellow', label: 'Event' },
    successComponent: { badge: '√', color: 'cyan', label: 'Component' }
  }
})

export { log, processEnv }
