import { readFile } from 'fs/promises'
import { join } from 'path'

export const PKG_MODE = `${process.cwd()}/src` !== __dirname
export const RootPATH = PKG_MODE ? join(process.cwd()) : join(__dirname)
export const metadata = async () => {
    const packageJSON = JSON.parse(await readFile(join(__dirname, '../package.json'), { encoding: 'utf-8' })) as Record<string, string | object | []>
    const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
    return Object.entries(packageJSON).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {})
}
