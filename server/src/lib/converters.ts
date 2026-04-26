export function bytesToSizeString(byteLength: number, decimals: number = 2): string {
  if (byteLength === 0) {
    return '0 B'
  }

  const k = 1024
  const dm = Math.max(0, decimals)
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] as const

  const index = Math.floor(Math.log(Math.abs(byteLength)) / Math.log(k))
  const value = byteLength / Math.pow(k, index)
  const formatted = value.toFixed(dm)

  return `${formatted} ${sizes[index]}`
}
