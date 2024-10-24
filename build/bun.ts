import { exec as execChild } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { createSign, createVerify } from 'node:crypto'
import { basename, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { join } from 'path'

const SIGNATURE_LENGTH = 512
const plugins = await glob(['plugins/*'])


if (!existsSync('release')) await mkdir('release')

await Promise.all([...plugins.map(build), build('core')])

async function build (plugin: string) {
  const path = join(basename(fileURLToPath(import.meta.url)), '../release')
  const pkg = JSON.parse(await readFile(join(plugin, 'package.json'), { encoding: 'utf-8' }))
  const appName = `${pkg.name}-${process.platform}-${process.arch}`

  if (pkg.scripts?.build !== undefined) await exec(`cd ${plugin} && bun run build`)
  
  await exec(`cd ${plugin} && bun build ./src/app.ts --target=bun --compile --outfile=${appName}`)
  await exec(`cd ${plugin} && 7z a -m0=lzma2 -mx9 -sfx ${appName}-installer ${appName}`)
  await exec(`mv ${plugin}/${appName} release/ && mv ${plugin}/${appName}-installer release/`)

  const plugins = [join(path, appName), join(path, `${appName}-installer`)]
  for (const pluginPath of plugins) {
    if (pluginPath.includes('installer')) return

    await sign(pluginPath)
    await singCheck(pluginPath)
  }

  const compressPaths = [`${appName}-installer`, join(path,`${appName}.sig`)]
  await exec(`cd ${path} && tar -cvzf ${appName}.tar.gz ${compressPaths.join(' ')}`)
}

async function sign (binaryPath: string): Promise<void> {
  const pluginName = basename(binaryPath, extname(binaryPath))
  const pluginPath = dirname(binaryPath)

  const binary = await readFile(binaryPath)
  const privateKey = await readFile(join(process.cwd(),  'core', 'privateKey.pem'), { encoding: 'utf8' })
  
  const signer = createSign(`sha${SIGNATURE_LENGTH}`)
  signer.update(binary)
  signer.end()
  
  const signature = signer.sign(privateKey)
  await writeFile(join(pluginPath, `${pluginName}.sig`), signature)
}

async function singCheck (binaryPath: string): Promise<void> {
  const pluginName = basename(binaryPath, extname(binaryPath))
  const pluginPath = dirname(binaryPath)

  const binary = await readFile(binaryPath)
  const publicKey = await readFile(join(process.cwd(),  'core', 'publicKey.pem'))
  const signature = await readFile(join(pluginPath, `${pluginName}.sig`))


  const verify = createVerify(`sha${SIGNATURE_LENGTH}`)
  verify.update(binary)
  verify.end()

  const isValid = verify.verify(publicKey, signature)

  if (isValid) {
    console.log('Assinatura verificada com sucesso!')
  } else {
    throw new Error('Falha na verificação da assinatura. O arquivo pode ter sido alterado.')
  }
}

async function exec (command: string) { return await new Promise<boolean>((resolve, reject) => {
  const child = execChild(command)
  child.stdout?.on('data', (output: string) => console.log(output))
  child.stderr?.on('data', (output: string) => console.log(output))
  child.on('close', (code, signal) => {
    if (code !== 0) {
      console.log(signal)
      reject(false)
    }
    resolve(true)
  })
})}