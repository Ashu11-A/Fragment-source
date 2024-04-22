import { type Config, type InternalConfig } from '@/interfaces/ConfigJson'
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import { cwd } from 'process'

export function getSettings (): Config {
  const data = readFileSync(resolve(cwd(), './settings.json'), { encoding: 'utf-8' })
  return JSON.parse(data)
}

export function getInternalSettings (): InternalConfig {
  const data = readFileSync(join(__dirname, '../settings/settings.json'), { encoding: 'utf-8' })
  return JSON.parse(data)
}
