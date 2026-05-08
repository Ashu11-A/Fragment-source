import type { CachedInteraction } from './interactions.js'

export interface TemplateManagerOptions {
  interaction: CachedInteraction
  template?: import('@/database/entity/Template.entry.js').default
}

export interface APIEmbed {
  title?: string
  description?: string
  color?: string | number
  image?: string
  thumbnail?: string
}
