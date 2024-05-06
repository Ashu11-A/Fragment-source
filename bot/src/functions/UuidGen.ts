import { db } from '@/app'
import { NIL as nilUUID, v4 as uuidv4, v5 as uuidv5 } from 'uuid'
import { json } from './Json'

// Gera um UUID v4 aleatorío
export function genv4 (): string {
  return uuidv4()
}

// Gera um UUID v5 baseado em um namespace e um nome
export function genv5 (name: string, type: string): string {
  const set = json('./src/config/settings.json')
  return uuidv5(name, set.namespaces[type])
}

export function nill (): string { return nilUUID }

export async function genButtonID (): Promise<{ Id: string, dateExpire: Date }> {
  const Id = genv4()
  const dateExpire = new Date(new Date().getTime() + 24 * 60 * 60 * 1000) // 24h

  await db.tokens.set(Id, { expireIn: dateExpire })
  return { Id, dateExpire }
}