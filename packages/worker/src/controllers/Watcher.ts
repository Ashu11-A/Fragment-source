import { watch } from 'chokidar'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { WatcherOptions } from '../types/watcher'

export class Watcher {
  private readonly path = join(process.cwd(), 'plugins')
  public readonly watcher

  constructor(public options: WatcherOptions) {
    if (!existsSync(this.path)) mkdirSync(this.path)
    this.watcher = watch(this.path)

    this.watcher.on('all', (event, arg, arg2) => {
      switch (event) {
      case 'ready': {
        console.log('Watcher is ready and monitoring changes.')
        if (this.options.onReady) this.options.onReady()
        break
      }
      case 'add': {
        console.log(`File added: ${arg}`)
        if (this.options.onAdd) this.options.onAdd(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'change': {
        console.log(`File changed: ${arg}`)
        if (this.options.onChangeFile) this.options.onChangeFile(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'addDir': {
        console.log(`Directory added: ${arg}`)
        if (this.options.onAddDir) this.options.onAddDir(arg as string)
        break
      }
      case 'unlink': {
        console.log(`File removed: ${arg}`)
        if (this.options.onUnlink) this.options.onUnlink(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'unlinkDir': {
        console.log(`Directory removed: ${arg}`)
        if (this.options.onUnlinkDir) this.options.onUnlinkDir(arg as string)
        break
      }
      case 'raw': {
        console.log(`Raw event info: ${arg}, ${arg2}`)
        if (this.options.onRaw) this.options.onRaw(event, arg as string, arg2)
        break
      }
      case 'error': {
        console.error(`Error occurred: ${arg}`)
        if (this.options.onError) this.options.onError(arg as Error)
        break
      }
      default: {
        console.log(`Unhandled event: ${event}`)
        break
      }
      }
    })
  }
}
