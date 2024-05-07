import { glob } from 'glob'
import { join } from 'path'

export async function register () {
  const dir = join(__dirname, '..', 'default')
  const paths = await glob([
    'commands/**/*.{ts,js}',
    'events/**/*.{ts,js}',
    'components/**/*.{ts,js}'
  ], { cwd: dir })

  for (const path of paths) {
    await import (join(dir, path))
  }
}
