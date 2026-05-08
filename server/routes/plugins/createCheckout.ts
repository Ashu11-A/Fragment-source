import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { PluginSale } from '@/database/entity/PluginSale.js'
import { PluginSaleStatus } from '@/database/enums.js'
import { billing } from '@/services/Billing.js'
import { toTrpcError } from '../_shared/errors.js'

const createCheckoutSchema = z.object({
  pluginId: z.number().int().positive(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  currency: z.string().min(3).max(8).default('usd'),
})

export const createCheckoutProcedure = protectedProcedure
  .input(createCheckoutSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const plugin = await Plugin.findOne({ where: { id: input.pluginId }, relations: { creator: true } })
      if (!plugin || !plugin.published) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Published plugin not found.',
      })

      if (plugin.creator.id === ctx.user.id) throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You cannot purchase your own plugin.',
      })

      const amountCents = Math.max(0, Math.round(plugin.price * 100))
      const feeCents = Math.round(amountCents * 0.15)
      const sellerCents = Math.max(0, amountCents - feeCents)

      const sale = await PluginSale.create({
        status: PluginSaleStatus.Pending,
        grossAmount: amountCents / 100,
        feeAmount: feeCents / 100,
        sellerAmount: sellerCents / 100,
        currency: input.currency.toLowerCase(),
        checkoutSessionId: null,
        paymentIntentId: null,
        plugin,
        buyer: { id: ctx.user.id },
        seller: { id: plugin.creator.id },
        paidAt: null,
      }).save()

      const session = await billing.createCheckout({
        pluginName: plugin.name,
        amountCents,
        currency: input.currency.toLowerCase(),
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        metadata: {
          pluginId: String(plugin.id),
          saleId: String(sale.id),
          buyerId: String(ctx.user.id),
          sellerId: String(plugin.creator.id),
        },
      })

      sale.checkoutSessionId = session.id
      sale.paymentIntentId = session.paymentIntentId
      await sale.save()

      return {
        checkoutUrl: session.url,
        sale,
        pricing: {
          grossAmount: sale.grossAmount,
          feeAmount: sale.feeAmount,
          sellerAmount: sale.sellerAmount,
          currency: sale.currency,
        },
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not create checkout')
    }
  })
