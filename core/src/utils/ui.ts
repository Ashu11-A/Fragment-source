import chalk from 'chalk'
import boxen from 'boxen'
import ora, { type Ora } from 'ora'
import figlet from 'figlet'

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

export function section(title: string): void {
  console.log('\n' + chalk.cyan('◆') + ' ' + chalk.bold(title))
}

export const log = {
  success: (msg: string) => console.log(chalk.green('  ✓') + '  ' + msg),
  error:   (msg: string) => console.error(chalk.red('  ✗') + '  ' + chalk.red(msg)),
  warn:    (msg: string) => console.warn(chalk.yellow('  !') + '  ' + chalk.yellow(msg)),
  info:    (msg: string) => console.log(chalk.blue('  >') + '  ' + chalk.dim(msg)),
  muted:   (msg: string) => console.log(chalk.dim('    · ' + msg)),
}

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan', spinner: 'dots' })
}

export function printWelcome(name: string): void {
  console.log(
    boxen(
      chalk.bold(`Hello, ${name}`) + '\n' + chalk.dim('Authenticated successfully'),
      { padding: { top: 0, bottom: 0, left: 2, right: 2 }, borderStyle: 'round', borderColor: 'green' },
    ),
  )
  console.log()
}

export const stat = {
  commands:   (label: string) => console.log(chalk.cyan('    /') + '  ' + label),
  components: (label: string) => console.log(chalk.blue('    #') + '  ' + label),
  events:     (label: string) => console.log(chalk.yellow('    ~') + '  ' + label),
  configs:    (label: string) => console.log(chalk.magenta('    =') + '  ' + label),
  crons:      (label: string) => console.log(chalk.green('    o') + '  ' + label),
}

export const watch = {
  added:   (file: string) => console.log(chalk.green('  +') + '  ' + chalk.dim(file)),
  changed: (file: string) => console.log(chalk.yellow('  ~') + '  ' + chalk.dim(file)),
  removed: (file: string) => console.log(chalk.red('  -') + '  ' + chalk.dim(file)),
}
