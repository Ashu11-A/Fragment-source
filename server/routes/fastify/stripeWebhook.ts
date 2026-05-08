import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { PluginSale } from '@/database/entity/PluginSale.js'
import { PluginSaleStatus } from '@/database/enums.js'
import { billing } from '@/services/Billing.js'

export default async function stripeWebhookRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.post('/webhooks/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature']
    const signatureHeader = Array.isArray(signature) ? signature[0] : signature

    if (typeof signatureHeader !== 'string' || signatureHeader.trim().length === 0) {
      return reply.status(400).send({ received: false, message: 'Missing stripe-signature header.' })
    }

    const rawBody = typeof request.rawBody === 'string' ? request.rawBody : ''
    if (rawBody.length === 0) {
      return reply.status(400).send({ received: false, message: 'Missing webhook raw body.' })
    }

    try {
      const event = billing.verifyWebhook(rawBody, signatureHeader)
      const objectData = event.data.object
      const metadata = (objectData.metadata ?? {}) as { saleId?: unknown }

      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const saleId = Number(String(metadata.saleId ?? ''))
        if (Number.isInteger(saleId) && saleId > 0) {
          const sale = await PluginSale.findOne({ where: { id: saleId } })
          if (sale) {
            sale.status = PluginSaleStatus.Paid
            sale.paidAt = new Date()
            const paymentIntent = objectData.payment_intent
            sale.paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : sale.paymentIntentId
            await sale.save()
          }
        }
      }

      if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
        const saleId = Number(String(metadata.saleId ?? ''))
        if (Number.isInteger(saleId) && saleId > 0) {
          const sale = await PluginSale.findOne({ where: { id: saleId } })
          if (sale && sale.status === PluginSaleStatus.Pending) {
            sale.status = PluginSaleStatus.Failed
            await sale.save()
          }
        }
      }

      return reply.send({ received: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid webhook payload.'
      return reply.status(400).send({ received: false, message })
    }
  })
}
