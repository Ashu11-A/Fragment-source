import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path, { resolve } from 'path'

const developmentEnvPath = resolve(process.cwd(), '.env.development')
const dev = existsSync(developmentEnvPath)

export const PKG_MODE = `${process.cwd()}/src` !== __dirname
export const RootPATH: string = PKG_MODE ? path.join(process.cwd()) : path.join(__dirname, '..')
export const metadata = async () => JSON.parse(await readFile(path.join(__dirname, '..', 'package.json'), { encoding: 'utf-8' }))
export const { parsed: env } = dotenv.config({ path: dev ? developmentEnvPath : resolve(process.cwd(), '.env') })
