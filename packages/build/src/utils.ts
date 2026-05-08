const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|][^\x07\x1B]*(?:\x07|\x1B\\)|.)/g

export function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '')
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  const kilo = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const index = Math.floor(Math.log(bytes) / Math.log(kilo))
  return `${parseFloat((bytes / Math.pow(kilo, index)).toFixed(decimals))} ${sizes[index]}`
}
