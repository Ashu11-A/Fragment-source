import chalk from 'chalk'
import boxen from 'boxen'
import ora, { type Ora } from 'ora'
import figlet from 'figlet'

// ── Symbols ──────────────────────────────────────────────────────────────────
//
//  General
//  ✓  green    success
//  ✗  red      error
//  !  yellow   warning
//  >  blue     info
//  ·  dim      muted
//  ◆  cyan     section header
//
//  Plugin stats (each type has its own symbol + color)
//  /  cyan     commands   (slash commands)
//  #  blue     components
//  ~  yellow   events
//  =  magenta  configs
//  o  green    crons
//
//  Watcher
//  +  green    file added
//  -  red      file removed
//  ~  yellow   file changed

// ── Banner ───────────────────────────────────────────────────────────────────

function renderFiglet(text: string): Promise<string> {
  return new Promise((resolve) => {
    figlet(text, { font: 'Small' }, (err, result) => {
      resolve(err || !result ? text : result)
    })
  })
}

export async function banner(version: string): Promise<void> {
  const art = await renderFiglet('Fragment')

  console.log(
    boxen(
      chalk.cyan(art) +
        '\n' +
        chalk.dim('Discord Bot Framework  ') +
        chalk.bold(`v${version}`),
      {
        padding: { top: 1, bottom: 1, left: 3, right: 3 },
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center',
      }
    )
  )
}

// ── Section headers ──────────────────────────────────────────────────────────

export function section(title: string): void {
  console.log('\n' + chalk.cyan('◆') + ' ' + chalk.bold(title))
}

// ── Structured log helpers ───────────────────────────────────────────────────

export const log = {
  success: (msg: string) => console.log(chalk.green('  ✓') + '  ' + msg),
  error:   (msg: string) => console.error(chalk.red('  ✗') + '  ' + chalk.red(msg)),
  warn:    (msg: string) => console.warn(chalk.yellow('  !') + '  ' + chalk.yellow(msg)),
  info:    (msg: string) => console.log(chalk.blue('  >') + '  ' + chalk.dim(msg)),
  muted:   (msg: string) => console.log(chalk.dim('    · ' + msg)),
}

// ── Spinner factory ──────────────────────────────────────────────────────────

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan', spinner: 'dots' })
}

// ── Plugin stat lines ────────────────────────────────────────────────────────

export const stat = {
  commands:   (label: string) => console.log(chalk.cyan('    /') + '  ' + label),
  components: (label: string) => console.log(chalk.blue('    #') + '  ' + label),
  events:     (label: string) => console.log(chalk.yellow('    ~') + '  ' + label),
  configs:    (label: string) => console.log(chalk.magenta('    =') + '  ' + label),
  crons:      (label: string) => console.log(chalk.green('    o') + '  ' + label),
}

// ── Watcher event formatters ─────────────────────────────────────────────────

export const watch = {
  added:   (file: string) => console.log(chalk.green('  +') + '  ' + chalk.dim(file)),
  changed: (file: string) => console.log(chalk.yellow('  ~') + '  ' + chalk.dim(file)),
  removed: (file: string) => console.log(chalk.red('  -') + '  ' + chalk.dim(file)),
}
