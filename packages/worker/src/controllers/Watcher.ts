import { watch } from 'chokidar'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import type { WatcherOptions } from '../types/watcher.js'
import { i18 } from '../index.js'

export class Watcher {
  private readonly path = join(process.cwd(), 'plugins')
  public readonly watcher

  constructor(public options: WatcherOptions) {
    if (!existsSync(this.path)) mkdirSync(this.path)
    this.watcher = watch(this.path, {
      ignoreInitial: options.ignoreInitial ?? false,
    })

    this.watcher.on('all', (event, arg, arg2) => {
      switch (event) {
      case 'ready': {
        if (this.options.onReady) this.options.onReady()
        break
      }
      case 'add': {
        console.log(chalk.green('  +') + '  ' + chalk.dim(arg))
        if (this.options.onAdd) this.options.onAdd(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'change': {
        console.log(chalk.yellow('  ~') + '  ' + chalk.dim(arg))
        if (this.options.onChangeFile) this.options.onChangeFile(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'addDir': {
        if (this.options.onAddDir) this.options.onAddDir(arg as string)
        break
      }
      case 'unlink': {
        console.log(chalk.red('  -') + '  ' + chalk.dim(arg))
        if (this.options.onUnlink) this.options.onUnlink(arg as string)
        if (this.options.onChange) this.options.onChange(arg as string)
        break
      }
      case 'unlinkDir': {
        if (this.options.onUnlinkDir) this.options.onUnlinkDir(arg as string)
        break
      }
      case 'raw': {
        if (this.options.onRaw) this.options.onRaw(event, arg as string, arg2)
        break
      }
      case 'error': {
        console.error(chalk.red('  ✗') + '  ' + chalk.red(i18('watcher.error', { error: arg })))
        if (this.options.onError) this.options.onError(arg as unknown as Error)
        break
      }
      default: break
      }
    })
  }
}
