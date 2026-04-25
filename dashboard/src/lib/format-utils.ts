export function formatPrice(price: number, locale = 'pt-BR', currency = 'BRL'): string {
  if (price === 0) return 'Grátis'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(price)
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(decimals)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(decimals)} MB`
}

export function formatDate(date: string | Date, locale = 'pt-BR'): string {
  return new Date(date).toLocaleDateString(locale)
}

export function formatDateTime(date: string | Date, locale = 'pt-BR'): string {
  return new Date(date).toLocaleString(locale)
}
