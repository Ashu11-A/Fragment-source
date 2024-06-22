import { readFile } from 'fs/promises'
import { TFunction } from 'i18next'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { Lang } from './controller/lang.js'

export let i18: TFunction<"translation", undefined>
export const loader = async () => i18 = await new Lang().create()

export const __dirname = dirname(fileURLToPath(import.meta.url))

export const PKG_MODE = `${process.cwd()}/src` !== __dirname
export const RootPATH: string = PKG_MODE ? path.join(process.cwd()) : path.join(__dirname, '..')
export const metadata = async () => JSON.parse(await readFile(path.join(__dirname, '..', 'package.json'), { encoding: 'utf-8' }))
