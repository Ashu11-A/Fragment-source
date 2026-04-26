export function formatPath(path: string) {
  path = path.replace(/\.(ts|js)$/i, '')
    .replace('index', '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[/\\]+$/, '')
    .replace(/\\/g, '/')
    .replace(/\$/g, ':')
  if (!path.startsWith('/')) path = '/' + path

  return path
}
