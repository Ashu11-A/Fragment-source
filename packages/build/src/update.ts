import { exec } from 'node:child_process'
import { glob } from 'glob'
import { Presets, SingleBar } from 'cli-progress'
import chalk from 'chalk'
import { clear } from 'node:console'

async function executeCommand(command: string, directory: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { cwd: directory })

    child.stdout?.on('data', (output: string | Buffer) => process.stdout.write(chalk.gray(output.toString())))
    child.stderr?.on('data', (output: string | Buffer) => process.stderr.write(chalk.red(output.toString())))

    child.on('close', (code: number | null) => {
      if (code !== 0) {
        return reject(new Error(`Command failed: ${command} in ${directory}`))
      }
      return resolve()
    })
  })
}

const progressBar = new SingleBar({
  format: `Progresso de atualizacao | ${chalk.cyan('{bar}')} | {percentage}% || {value}/{total} Pacotes`,
}, Presets.shades_classic)

const packagePaths = await glob(['./', 'plugins/*', 'packages/*', 'core', 'server'], { cwd: process.cwd() })

progressBar.start(packagePaths.length, 0)

for (const packagePath of packagePaths) {
  clear()
  progressBar.increment()
  process.stdout.write(chalk.bold(`\nAtualizando pacote: ${chalk.green(packagePath)}\n`))

  try {
    await executeCommand('bun update', packagePath)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(chalk.red(`Erro ao atualizar o pacote ${packagePath}: ${errorMessage}`))
  }
}

progressBar.stop()
console.log(chalk.green('\nAtualizacao concluida com sucesso!'))
