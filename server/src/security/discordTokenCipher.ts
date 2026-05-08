import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import argon2 from 'argon2'

const KEY_LENGTH = 32
const DEFAULT_SALT_LENGTH = 16
const DEFAULT_IV_LENGTH = 12
const SEPARATOR = '$'

export async function encryptDiscordToken(discordToken: string): Promise<string> {
  const normalizedToken = discordToken.trim()
  if (normalizedToken.length === 0) {
    throw new Error('Discord token cannot be empty.')
  }

  const salt = randomBytes(readPositiveIntEnv('SALT_LENGTH', DEFAULT_SALT_LENGTH))
  const iv = randomBytes(readPositiveIntEnv('IV_LENGTH', DEFAULT_IV_LENGTH))
  const key = await deriveEncryptionKey(salt)

  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const ciphertext = Buffer.concat([cipher.update(normalizedToken, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(SEPARATOR)
  } finally {
    key.fill(0)
  }
}

export async function decryptDiscordToken(serialized: string): Promise<string> {
  const parts = serialized.split(SEPARATOR)
  if (parts.length !== 4) {
    throw new Error('Invalid Discord token envelope format.')
  }

  const [saltB64, ivB64, authTagB64, ciphertextB64] = parts
  const salt = decodeBase64(saltB64!, 'salt')
  const iv = decodeBase64(ivB64!, 'iv')
  const authTag = decodeBase64(authTagB64!, 'authTag')
  const ciphertext = decodeBase64(ciphertextB64!, 'ciphertext')
  const key = await deriveEncryptionKey(salt)

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString('utf8').trim()
  } finally {
    key.fill(0)
  }
}

export function hasDiscordToken(bot: { token?: string | null }): bot is { token: string } {
  return typeof bot.token === 'string' && bot.token.length > 0
}

async function deriveEncryptionKey(salt: Buffer): Promise<Buffer> {
  const secret = readEncryptionSecret()
  const key = await argon2.hash(secret, {
    type: argon2.argon2id,
    salt,
    hashLength: KEY_LENGTH,
    timeCost: 3,
    memoryCost: 19_456,
    parallelism: 1,
    raw: true,
  })

  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new Error('Failed to derive Discord token encryption key.')
  }

  return Buffer.from(key)
}

function readEncryptionSecret(): string {
  const configured = process.env['DISCORD_TOKEN_ENCRYPTION_SECRET'] ?? process.env.REFRESH_TOKEN
  const normalized = configured?.trim()
  if (!normalized || normalized.length < 32) {
    throw new Error('DISCORD_TOKEN_ENCRYPTION_SECRET must be configured with at least 32 characters.')
  }
  return normalized
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return parsed
}

function decodeBase64(value: string, field: string): Buffer {
  try {
    const decoded = Buffer.from(value, 'base64')
    if (decoded.length === 0) throw new Error('empty')
    return decoded
  } catch {
    throw new Error(`Invalid Discord token envelope field: ${field}.`)
  }
}
