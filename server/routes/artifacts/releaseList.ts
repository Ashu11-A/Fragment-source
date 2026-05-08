import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { getReleasesRepo, listRecentReleases } from '@/lib/githubReleases.js'
import { toTrpcError } from '../_shared/errors.js'

const releaseListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
}).default({})

export const releaseListProcedure = protectedProcedure
  .input(releaseListSchema)
  .query(async ({ input }) => {
    try {
      const releases = await listRecentReleases(input.limit)

      return {
        repository: getReleasesRepo(),
        releases,
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not list releases')
    }
  })
