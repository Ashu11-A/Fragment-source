import type { CliRenderer, KeyEvent } from '@opentui/core'
import chokidar, { type FSWatcher } from 'chokidar'
import { join } from 'node:path'
import {
  cleanupPorts,
  killService,
  logPlugin,
  logSystem,
  onStatusChange,
  onLogLine,
  services,
  startService,
} from '@/dev/services'
import { rebuildPlugins } from '@/dev/plugins'
import type { ServiceName } from '@/types/index'
import { PLUGIN_DEBOUNCE_MS } from '@/tui/constants'
import { LogBuffer } from '@/tui/components/log-buffer'
import { MainScreen } from '@/tui/components/main-screen'
import { SelectorScreen } from '@/tui/components/selector-screen'
import { Toast } from '@/tui/components/toast'
import { DebugLogger } from '@/tui/utils/debug-logger'
import { writeToClipboard } from '@/tui/utils/clipboard'

type Screen = 'selector' | 'main'

export class DevApp {
  private readonly renderer: CliRenderer
  private readonly logger: DebugLogger
  private readonly logBuffer: LogBuffer
  private readonly selectorScreen: SelectorScreen
  private readonly mainScreen: MainScreen
  private readonly fileWatcher: FSWatcher
  private readonly toast: Toast
  private currentScreen: Screen = 'selector'

  constructor(renderer: CliRenderer) {
    this.renderer = renderer
    this.logger   = new DebugLogger(join(process.cwd(), 'debugger.log'))

    this.logger.write('[tui] Renderer created')

    this.selectorScreen = new SelectorScreen(renderer)
    this.mainScreen     = new MainScreen(renderer)
    this.logBuffer      = new LogBuffer(renderer, this.logger)
    this.toast          = new Toast(renderer)

    onStatusChange(() => this.mainScreen.sidebar.refresh())
    onLogLine((source, line) => this.logBuffer.append(source, line))

    this.fileWatcher = this.buildFileWatcher()

    // Hide the toast on any mousedown so it leaves the selection tree
    // before the drag ends and getSelectedText() is called.
    this.mainScreen.root.onMouseDown = () => this.toast.hide()

    this.renderer.keyInput.on('keypress', (key) => this.handleKey(key))
    this.renderer.on('selection', (sel) => this.handleSelection(sel))
    this.renderer.on('destroy', () => this.cleanup())
  }

  start(): void {
    this.renderer.root.add(this.selectorScreen.root)
    this.renderer.start()
    this.logger.write('[tui] Renderer started')
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private buildFileWatcher(): FSWatcher {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const watcher = chokidar.watch(['plugins/**/*', 'packages/**/*'], {
      cwd: process.cwd(),
      ignored: [
        'plugins/*/src/register.ts',
        'plugins/*/entries.json',
        '**/node_modules/**',
        '**/.git/**',
      ],
      ignoreInitial: true,
    })

    watcher.on('all', () => {
      if (debounceTimer !== null) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        logPlugin('Rebuilding plugins...')
        void this.runRebuild().then(() => logPlugin('Done.'))
      }, PLUGIN_DEBOUNCE_MS)
    })

    return watcher
  }

  private async runRebuild(): Promise<void> {
    try {
      await rebuildPlugins()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logPlugin(`Build error: ${msg}`)
      this.logger.write(`[rebuildPlugins] ${err instanceof Error ? (err.stack ?? msg) : msg}`)
    }
  }

  private handleKey(key: KeyEvent): void {
    this.logger.write(`[key] name=${key.name} ctrl=${key.ctrl} screen=${this.currentScreen}`)

    if (key.ctrl && key.name === 'c') { this.shutdown(); return }

    if (this.currentScreen === 'selector') {
      this.handleSelectorKey(key)
    } else {
      this.handleMainKey(key)
    }
  }

  private handleSelectorKey(key: KeyEvent): void {
    const action = this.selectorScreen.handleKey(key)

    switch (action.kind) {
    case 'confirm':
      if (action.selected.length > 0) this.switchToMain(action.selected)
      break
    case 'quit':
      this.shutdown()
      break
    }
  }

  private handleMainKey(key: KeyEvent): void {
    switch (key.name) {
    case 'q':        this.shutdown();               break
    case '1':        startService('server');         break
    case '2':        startService('daemon');         break
    case '3':        startService('dashboard');      break
    case '4':
      logPlugin('Rebuilding...')
      void this.runRebuild().then(() => logPlugin('Done.'))
      break
    case '5':        startService('node');           break
    case 'question': this.switchToSelector();        break
    }
  }

  private switchToMain(selected: readonly ServiceName[]): void {
    this.currentScreen = 'main'
    this.renderer.root.remove(this.selectorScreen.root.id)
    this.renderer.root.add(this.mainScreen.root)

    // Attach the log buffer now that the content box is live in the tree
    this.logBuffer.attach(this.mainScreen.logPanel.logContent)
    this.logger.write('[tui] Switched to main screen')

    cleanupPorts([5173, 3500])
    logSystem(`Starting ${selected.length} service(s)...`)
    logSystem('Building plugins...')

    rebuildPlugins()
      .then(() => {
        logSystem('Plugins ready.')
        for (const name of selected) startService(name)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        logSystem(`Plugin build failed: ${msg}`)
        this.logger.write(`[rebuildPlugins] ${err instanceof Error ? (err.stack ?? msg) : msg}`)
      })
  }

  private switchToSelector(): void {
    this.currentScreen = 'selector'
    this.renderer.root.remove(this.mainScreen.root.id)
    this.renderer.root.add(this.selectorScreen.root)
    this.logger.write('[tui] Switched to selector screen')
  }

  private handleSelection(sel: { getSelectedText(): string }): void {
    const text = sel.getSelectedText()
    if (!text) return
    void this.copyText(text).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.write(`[clipboard] Copy failed: ${msg}`)
      this.toast.show('Copy failed')
    })
  }

  private async copyText(text: string): Promise<void> {
    if (this.renderer.isOsc52Supported()) {
      this.renderer.copyToClipboardOSC52(text)
      this.toast.show('Copied to clipboard')
      return
    }

    const isWayland = Boolean(process.env['WAYLAND_DISPLAY'])
    const candidates: Array<[string, string[]]> =
      process.platform === 'darwin' ? [['pbcopy', []]] :
        process.platform === 'win32'  ? [['clip', []]] :
          isWayland
            ? [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]]
            : [['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']], ['wl-copy', []]]

    for (const [bin, args] of candidates) {
      const ok = await writeToClipboard(bin, args, text)
      if (ok) {
        this.toast.show('Copied to clipboard')
        return
      }
    }

    this.toast.show('Copy failed: install wl-copy or xclip')
  }

  private shutdown(): void {
    logSystem('Shutting down...')
    for (const name of Object.keys(services) as ServiceName[]) killService(name)
    void this.fileWatcher.close()
    this.renderer.destroy()
    process.exit(0)
  }

  private cleanup(): void {
    for (const name of Object.keys(services) as ServiceName[]) killService(name)
    void this.fileWatcher.close()
  }
}
