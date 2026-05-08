import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure } from '@/trpc.js'
import { PluginSale } from '@/database/entity/PluginSale.js'
import { PluginSaleStatus } from '@/database/enums.js'
import { toTrpcError } from '../_shared/errors.js'

const finalizeCheckoutSchema = z.object({
  saleId: z.number().int().positive(),
  status: z.nativeEnum(PluginSaleStatus),
  paymentIntentId: z.string().max(128).nullable().optional(),
})

export const finalizeCheckoutProcedure = adminProcedure
  .input(finalizeCheckoutSchema)
  .mutation(async ({ input }) => {
    try {
      const sale = await PluginSale.findOne({
        where: { id: input.saleId },
        relations: { plugin: true, buyer: true, seller: true },
      })
      if (!sale) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sale not found.',
      })

      sale.status = input.status
      if (input.paymentIntentId !== undefined) {
        sale.paymentIntentId = input.paymentIntentId
      }
      sale.paidAt = input.status === PluginSaleStatus.Paid ? new Date() : null
      await sale.save()

      return sale
    } catch (error) {
      throw toTrpcError(error, 'Could not finalize checkout')
    }
  })
