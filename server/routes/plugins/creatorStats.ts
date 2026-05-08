import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { PluginSale } from '@/database/entity/PluginSale.js'
import { PluginSaleStatus } from '@/database/enums.js'
import { subDays, subMonths, subYears } from 'date-fns'
import { toTrpcError } from '../_shared/errors.js'

const creatorStatsPeriods = ['7d', '30d', '90d', '12m', 'monthly', 'quarterly', 'semiannual'] as const

const creatorStatsSchema = z.object({
  period: z.enum(creatorStatsPeriods).default('30d'),
}).default({})

function resolvePeriodStart(period: (typeof creatorStatsPeriods)[number]): Date {
  const now = new Date()
  switch (period) {
  case '7d':
    return subDays(now, 7)
  case 'monthly':
  case '30d':
    return subDays(now, 30)
  case 'quarterly':
  case '90d':
    return subDays(now, 90)
  case 'semiannual':
    return subMonths(now, 6)
  default:
    return subYears(now, 1)
  }
}

export const creatorStatsProcedure = protectedProcedure
  .input(creatorStatsSchema)
  .query(async ({ input, ctx }) => {
    try {
      const startDate = resolvePeriodStart(input.period)

      const sales = await PluginSale.find({
        where: {
          seller: { id: ctx.user.id },
          status: PluginSaleStatus.Paid,
        },
        relations: { plugin: true },
        order: { createdAt: 'DESC' },
      })

      const filtered = sales.filter((sale) => sale.createdAt >= startDate)
      const byPlugin = new Map<number, { pluginId: number; pluginName: string; sales: number; sellerAmount: number }>()

      for (const sale of filtered) {
        const current = byPlugin.get(sale.plugin.id) ?? {
          pluginId: sale.plugin.id,
          pluginName: sale.plugin.name,
          sales: 0,
          sellerAmount: 0,
        }
        current.sales += 1
        current.sellerAmount += sale.sellerAmount
        byPlugin.set(sale.plugin.id, current)
      }

      const totalGross = filtered.reduce((sum, sale) => sum + sale.grossAmount, 0)
      const totalFee = filtered.reduce((sum, sale) => sum + sale.feeAmount, 0)
      const totalSeller = filtered.reduce((sum, sale) => sum + sale.sellerAmount, 0)

      return {
        period: input.period,
        totals: {
          count: filtered.length,
          grossAmount: totalGross,
          feeAmount: totalFee,
          sellerAmount: totalSeller,
        },
        plugins: [...byPlugin.values()].sort((left, right) => right.sellerAmount - left.sellerAmount),
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not load creator stats')
    }
  })
