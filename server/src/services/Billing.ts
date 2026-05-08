import { TRPCError } from '@trpc/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { Bot } from '@/database/entity/Bot.js'
import { Plan } from '@/database/entity/Plan.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { MoreThan } from 'typeorm'

export interface EffectivePlan {
  plan: Plan
  subscription: Subscription | null
}

export interface CheckoutInput {
  pluginName: string
  amountCents: number
  currency: string
  successUrl: string
  cancelUrl: string
  metadata: Record<string, string>
}

export interface CheckoutSession {
  id: string
  url: string
  paymentIntentId: string | null
}

export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

interface StripeSignature {
  timestamp: number
  signatures: string[]
}

export class Billing {
  // --- Plan limits ---

  async effectivePlan(userId: number): Promise<EffectivePlan> {
    const now = new Date()

    const activeSub = await Subscription.findOne({
      where: {
        user: { id: userId },
        active: true,
        expiresAt: MoreThan(now),
      },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    })

    if (activeSub?.plan) {
      return { plan: activeSub.plan, subscription: activeSub }
    }

    const freePlan = await Plan.findOne({ where: { key: 'free' } })
    if (!freePlan) {
      throw new Error('Free plan not found in database.')
    }

    return { plan: freePlan, subscription: null }
  }

  async countBots(userId: number): Promise<number> {
    return Bot.count({ where: { user: { id: userId } } })
  }

  async countActiveBots(userId: number): Promise<number> {
    return Bot.count({ where: { user: { id: userId }, enabled: true } })
  }

  async countFreePlugins(botId: number): Promise<number> {
    const bot = await Bot.findOne({
      where: { id: botId },
      relations: { plugins: true },
    })
    if (!bot) return 0
    return bot.plugins.filter((plugin) => plugin.price === 0).length
  }

  isUnlimited(value: number): boolean {
    return value < 0
  }

  async canCreate(userId: number): Promise<{ allowed: boolean; limit: number; current: number }> {
    const { plan } = await this.effectivePlan(userId)
    const current = await this.countBots(userId)

    if (this.isUnlimited(plan.maxBots)) {
      return { allowed: true, limit: -1, current }
    }

    return { allowed: current < plan.maxBots, limit: plan.maxBots, current }
  }

  async canEnable(userId: number): Promise<{ allowed: boolean; limit: number; current: number }> {
    const { plan } = await this.effectivePlan(userId)
    const current = await this.countActiveBots(userId)

    if (this.isUnlimited(plan.maxBots)) {
      return { allowed: true, limit: -1, current }
    }

    return { allowed: current < plan.maxBots, limit: plan.maxBots, current }
  }

  async canAssignPlugin(botId: number): Promise<{ allowed: boolean; limit: number; current: number }> {
    const bot = await Bot.findOne({ where: { id: botId }, relations: { user: true } })
    if (!bot) {
      return { allowed: false, limit: 0, current: 0 }
    }

    const { plan } = await this.effectivePlan(bot.user.id)
    const current = await this.countFreePlugins(botId)

    if (this.isUnlimited(plan.maxPlugins)) {
      return { allowed: true, limit: -1, current }
    }

    return { allowed: current < plan.maxPlugins, limit: plan.maxPlugins, current }
  }

  async disableAll(userId: number): Promise<number> {
    const result = await Bot.update(
      { user: { id: userId }, enabled: true },
      { enabled: false },
    )
    return result.affected ?? 0
  }

  // --- Stripe ---

  private parseSignatureHeader(header: string): StripeSignature {
    const parts = header.split(',').map((part) => part.trim())
    const timestampValue = parts.find((part) => part.startsWith('t='))?.slice(2)
    const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3))

    const timestamp = timestampValue ? Number(timestampValue) : Number.NaN
    if (!Number.isFinite(timestamp) || signatures.length === 0) {
      throw new Error('Malformed Stripe signature header')
    }

    return { timestamp, signatures }
  }

  private secureCompareHex(expectedHex: string, incomingHex: string): boolean {
    try {
      const expected = Buffer.from(expectedHex, 'hex')
      const incoming = Buffer.from(incomingHex, 'hex')
      if (expected.length === 0 || incoming.length === 0 || expected.length !== incoming.length) {
        return false
      }
      return timingSafeEqual(expected, incoming)
    } catch {
      return false
    }
  }

  verifyWebhook(rawBody: string, signatureHeader: string): WebhookEvent {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (endpointSecret == null || endpointSecret.trim().length === 0) {
      throw new Error('Stripe webhook secret is not configured')
    }

    const parsed = this.parseSignatureHeader(signatureHeader)
    const toleranceSeconds = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || 300)
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
      throw new Error('Stripe webhook signature timestamp is outside tolerance')
    }

    const signedPayload = `${parsed.timestamp}.${rawBody}`
    const expectedSignature = createHmac('sha256', endpointSecret)
      .update(signedPayload, 'utf8')
      .digest('hex')

    const isValid = parsed.signatures.some((sig) => this.secureCompareHex(expectedSignature, sig))
    if (!isValid) {
      throw new Error('Invalid Stripe webhook signature')
    }

    let parsedEvent: unknown
    try {
      parsedEvent = JSON.parse(rawBody)
    } catch {
      throw new Error('Stripe webhook payload is not valid JSON')
    }

    if (
      typeof parsedEvent !== 'object'
      || parsedEvent == null
      || !('id' in parsedEvent)
      || !('type' in parsedEvent)
      || !('data' in parsedEvent)
    ) {
      throw new Error('Stripe webhook payload is missing required fields')
    }

    return parsedEvent as WebhookEvent
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (secretKey == null || secretKey.trim().length === 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Stripe is not configured (missing STRIPE_SECRET_KEY).',
      })
    }

    const payload = new URLSearchParams()
    payload.set('mode', 'payment')
    payload.set('success_url', input.successUrl)
    payload.set('cancel_url', input.cancelUrl)
    payload.set('line_items[0][quantity]', '1')
    payload.set('line_items[0][price_data][currency]', input.currency)
    payload.set('line_items[0][price_data][unit_amount]', String(input.amountCents))
    payload.set('line_items[0][price_data][product_data][name]', input.pluginName)

    for (const [key, value] of Object.entries(input.metadata)) {
      payload.set(`metadata[${key}]`, value)
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Stripe checkout creation failed: ${detail}`,
      })
    }

    const data = await response.json() as {
      id?: string
      url?: string
      payment_intent?: string | null
    }

    if (!data.id || !data.url) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Stripe response is missing required checkout fields.',
      })
    }

    return {
      id: data.id,
      url: data.url,
      paymentIntentId: data.payment_intent ?? null,
    }
  }
}

export const billing = new Billing()
