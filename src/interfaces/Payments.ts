import { type EmbedType, type EmbedFooterData, type EmbedAssetData, type APIEmbedProvider, type EmbedAuthorData, type APIEmbedField } from 'discord.js'

export interface ProductCartData {
  id: string
  name?: string
  amount: number
  quantity: number
  isIncremental: boolean
  isEphemeral: boolean
  // Apenas para não dar problema na criação do ephemeral
  properties?: undefined
  role?: undefined
  //
  coins?: number
  messageId?: string
  cupom?: {
    name: string
    porcent: number
  }
  pterodactyl?: {
    egg: {
      name: string
      nestId: number
      eggId: number
    }
    cpu: string
    ram: string
    disk: string
    time: string
    // port: string
  }
}

export interface cartData {
  UUID?: string
  userID: string
  channelId?: string
  products: ProductCartData[]
  messageId?: string
  typeEmbed: number
  typeRedeem?: 'CtrlPanel' | 'Pterodactyl' | 'DM'
  paymentId?: number
  user?: PaymentUserCTRL
  properties?: Record<string, boolean> | undefined
  fields?: Array<{ value: string }>
}

interface EmbedData {
  title?: string
  type?: EmbedType
  description?: string
  url?: string
  timestamp?: string | number | Date
  color?: number | string
  footer?: EmbedFooterData
  image?: EmbedAssetData
  thumbnail?: EmbedAssetData
  provider?: APIEmbedProvider
  author?: EmbedAuthorData
  fields?: APIEmbedField[]
  video?: EmbedAssetData
}

export interface productData {
  id: string
  role: string
  embed: EmbedData
  // Saber se o produto está ativado
  status: boolean
  properties: Record<string, boolean>
  price?: number
  coins?: number
  pterodactyl?: {
    egg: {
      name: string
      nestId: number
      eggId: number
    }
    cpu: string
    ram: string
    disk: string
    time: string
    // port: string
  }
}

export interface PaymentUserCTRL {
  id: number
  name: string
  email: string
  pterodactylId: number
  role: string
}

export interface UserPtero {
  id: number
  username: string
  email: string
  root_admin: boolean
}
export interface PaymentUserPtero {
  object: 'user'
  attributes: UserPtero
}

export interface PaymentMetadataPtero {
  total: number
  count: number
  per_page: number
  current_page: number
  total_pages: number
  links: object
}

export interface PaymentServerPtero {
  id: number
  userId: number
  identifier: string
  name: string
  suspended: boolean
  createAt: number
}

export interface PaymentServerCTRL {
  userId: number
  pterodactylId: number
  identifier: string
  name: string
  suspended: boolean
  createAt: number
}

export interface infoPayment {
  userName: string
  userId: string
  guildId: string | null
  channelId: string
  price?: number
  UUID: string
  mpToken?: string
  method?: 'debit_card' | 'credit_card'
  ipn?: string
}
