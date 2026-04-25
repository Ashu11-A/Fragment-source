export const GRADIENT_PALETTE: Record<string, [string, string]> = {
  'from-blue-500 to-cyan-500': ['#3b82f6', '#06b6d4'],
  'from-blurple-500 to-indigo-500': ['#6366f1', '#4f46e5'],
  'from-purple-500 to-pink-500': ['#a855f7', '#ec4899'],
  'from-emerald-500 to-teal-500': ['#10b981', '#14b8a6'],
}

export function getGradientColors(
  gradient: string,
  fallback: [string, string] = ['#6366f1', '#4f46e5'],
): [string, string] {
  return GRADIENT_PALETTE[gradient] ?? fallback
}

export function createLinearGradient(gradient: string, direction = '135deg'): string {
  const [color1, color2] = getGradientColors(gradient)
  return `linear-gradient(${direction}, ${color1}, ${color2})`
}
