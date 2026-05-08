import { z } from 'zod'

export const nodeBaseSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(5000).nullable().optional(),
  maintenance: z.boolean().optional(),
  location: z.string().max(50).optional(),
  memory: z.number().int().min(0).optional(),
  memoryOverAllocationPercentage: z.number().int().min(0).max(1000).optional(),
  disk: z.number().int().min(0).optional(),
  diskOverAllocationPercentage: z.number().int().min(0).max(1000).optional(),
})

export const createNodeSchema = nodeBaseSchema

export const updateNodeSchema = nodeBaseSchema.extend({
  id: z.number().int().positive(),
}).partial().required({ id: true })

export const nodeIdSchema = z.object({
  id: z.number().int().positive(),
})

export const assignBotNodeSchema = z.object({
  nodeId: z.number().int().positive(),
  botId: z.number().int().positive(),
})
