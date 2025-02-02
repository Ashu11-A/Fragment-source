import { exec as execChild } from 'child_process'
import { glob } from 'glob'
import { Presets, SingleBar } from 'cli-progress'
import chalk from 'chalk'
import { clear } from 'console'

const exec = async (command: string, directory: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = execChild(`cd ${directory} && ${command}`)

    child.stdout?.on('data', (output) => process.stdout.write(chalk.gray(output)))
    child.stderr?.on('data', (output) => process.stderr.write(chalk.red(output)))

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Command failed: ${command} in ${directory}`))
      }
      return resolve()
    })
  })
}

const bar = new SingleBar({
  format: `Progresso de atualização | ${chalk.cyan('{bar}')} | {percentage}% || {value}/{total} Pacotes`,
}, Presets.shades_classic)

const packages = await glob(['./', 'plugins/*', 'packages/*', 'core', 'server'], { cwd: process.cwd() })

bar.start(packages.length, 0)

for (const pkg of packages) {
  clear()
  bar.increment()
  process.stdout.write(chalk.bold(`\nAtualizando pacote: ${chalk.green(pkg)}\n`)) // Log informativo ao atualizar
  try {
    await exec('bun update', pkg)
  } catch (error) {
    console.error(chalk.red(`Erro ao atualizar o pacote ${pkg}: ${(error as Error).message}`))
  }
}

bar.stop()
console.log(chalk.green('\nAtualização concluída com sucesso!'))