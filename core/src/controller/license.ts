import { RootPATH } from "@/index.js";
import prompt from 'prompts'
import { marked, Renderer } from 'marked'
import TerminalRenderer from 'marked-terminal'
import { watch } from 'chokidar'
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { __dirname } from '@/index.js'

let watched = false

export class License {
  async checker () {
    if (!watched) {
      watched = true
      const wather = watch('.license', { cwd: RootPATH })

      wather.on('all', () => this.checker())
    }
    if (existsSync(`${RootPATH}/.license`)) {
      const data = await readFile(`${RootPATH}/.license`, { encoding: 'utf-8' })
      const accept = /true/i.test(data)
      if (!accept) return await this.ask()
      return
    }
    await this.ask()
  }
  async ask () {
    const data = await readFile(join(__dirname, '../LICENSE.md'), { encoding: 'utf-8' })
    marked.setOptions({
      renderer: new TerminalRenderer() as Renderer
    })
    console.log(marked(data))


    const response = await prompt({
      name: 'accept',
      type: 'toggle',
      message: 'Você concorda com os termos apresentados acima?',
      initial: false
    })

    switch (response.accept) {
    case true: {
      await writeFile(`${RootPATH}/.license`, 'ACCEPT=true')
      break
    }
    default: {
      await writeFile(`${RootPATH}/.license`, 'ACCEPT=false')
      throw new Error('Não é possivel continuar!')
    }
    }
  }
}