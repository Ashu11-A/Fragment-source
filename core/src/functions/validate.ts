export function isJson (value: string | JSON | {}) {
  try {
    if (typeof value === 'string') JSON.parse(value)
    if (typeof value === 'object') return true
    return true
  } catch {
    return false
  }
}