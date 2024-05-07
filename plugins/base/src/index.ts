import { readFile } from 'fs/promises'
import path from 'path'

export const PKG_MODE = `${process.cwd()}/src` !== __dirname
export const RootPATH = PKG_MODE ? path.join(process.cwd()) : path.join(__dirname)
export const metadata = async () => JSON.parse(await readFile(path.join(__dirname, '..', 'package.json'), { encoding: 'utf-8' }))
