import { type Config } from '@/interfaces/ConfigJson'
import { readFileSync } from 'fs'

export default function getSettings (): Config {
  const data = readFileSync('./settings.json', { encoding: 'utf-8' })
  return JSON.parse(data) as Config
}
