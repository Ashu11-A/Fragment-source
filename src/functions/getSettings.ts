import { type EncryptedConfig, type Config, type InternalConfig } from '@/interfaces/ConfigJson'
import { AES, enc } from 'crypto-js'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { cwd } from 'process'

export function getSettings (): Config {
  const data = readFileSync(resolve(cwd(), './settings.json'), { encoding: 'utf-8' })
  return JSON.parse(data)
}

export function getInternalSettings (): InternalConfig {
  const data = readFileSync(join(__dirname, '../', 'settings/settings.json'), { encoding: 'utf-8' })
  return JSON.parse(data)
}

export function getEncryptedSettings (): EncryptedConfig | undefined {
  if (!existsSync(join(cwd(), '.key'))) {
    return undefined
  }

  const content = readFileSync(join(cwd(), '.key'), { encoding: 'utf-8' })
  const { token } = getInternalSettings()
  const decrypt = AES.decrypt(content, token)

  return JSON.parse(decrypt.toString(enc.Utf8)) ?? {}
}
