import { spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import { glob } from 'glob'
import { join } from 'path'
import { cwd } from 'process'
import { isBinaryFile } from 'isbinaryfile'

interface Plugin {
  name: string
  version: string
  author: string
  signature: string
  date: Date
  size: string
  commands: string[]
  events: string[]
  components: string[]
  crons: string[]
}

export class Plugins {
  public static plugins = 0
  public static loaded = 0
  private readonly path

  constructor() {
    if (!existsSync((cwd(), 'plugins'))) mkdir((cwd(), 'plugins'))
    this.path = join(cwd(), 'plugins')
  }

  async list() {
    const plugins = await glob(`${this.path}/*`)
    const valid = []
    for (const filePath of plugins) {
      if (!(await isBinaryFile(filePath))) continue
      valid.push(filePath)
    }
    Plugins.plugins = valid.length
    return valid
  }

  async load(port: string): Promise<void> {
    const plugins = await this.list()
    if (plugins.length === 0) {
      console.log('Nenhum plugin encontrado!')
      return
    }

    for (const filePath of plugins) {
      await new Promise((resolve, reject) => {
        const child = spawn(filePath, ['--port', port])

        child.on('error', (err) => { reject(err) })
        child.on('exit', (code, signal) => {
          if (code === 0) resolve(null)
          Plugins.plugins = Plugins.plugins - 1
          reject(`O binário ${filePath} saiu com código de erro ${code} e sinal ${signal}`)
        })
        child.stdout.once('data', (message) => {
          resolve(message)
        })
      })
    }
  }
}

    }
  }
