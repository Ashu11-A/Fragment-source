import { watch } from 'chokidar'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { WatcherOptions } from '../types/watcher.js'
import { i18 } from '../index.js' // Importa a função de tradução

export class Watcher {
  private readonly path = join(process.cwd(), 'plugins')
  public readonly watcher

  constructor(public options: WatcherOptions) {
    if (!existsSync(this.path)) mkdirSync(this.path)
    this.watcher = watch(this.path)

    this.watcher.on('all', (event, arg, arg2) => {
      switch (event) {
      case 'ready': {
        console.log(i18('watcher.ready'))
        if (this.options.onReady) this.options.onReady()
        break
      }
      case 'add': {
        console.log(i18('watcher.fileAdded', { file: arg }))
        if (this.options.onAdd) this.options.onAdd(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'change': {
        console.log(i18('watcher.fileChanged', { file: arg }))
        if (this.options.onChangeFile) this.options.onChangeFile(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'addDir': {
        console.log(i18('watcher.directoryAdded', { directory: arg }))
        if (this.options.onAddDir) this.options.onAddDir(arg as string)
        break
      }
      case 'unlink': {
        console.log(i18('watcher.fileRemoved', { file: arg }))
        if (this.options.onUnlink) this.options.onUnlink(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'unlinkDir': {
        console.log(i18('watcher.directoryRemoved', { directory: arg }))
        if (this.options.onUnlinkDir) this.options.onUnlinkDir(arg as string)
        break
      }
      case 'raw': {
        console.log(i18('watcher.raw', { arg, arg2 }))
        if (this.options.onRaw) this.options.onRaw(event, arg as string, arg2)
        break
      }
      case 'error': {
        console.error(i18('watcher.error', { error: arg }))
        if (this.options.onError) this.options.onError(arg as unknown as Error)
        break
      }
      default: {
        console.log(i18('watcher.unhandled', { event }))
        break
      }
      }
    })
  }
}
