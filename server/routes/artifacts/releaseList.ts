import { z } from 'zod'
import { getReleasesRepo, listRecentReleases } from '@/lib/githubReleases.js'
import { protectedProcedure } from '@/trpc.js'

export const releaseList = protectedProcedure
  .input(
    z.object({
      perPage: z.number().int().min(1).max(30).optional(),
    }).optional(),
  )
  .query(async ({ input }) => {
    const perPage = input?.perPage ?? 20
    const releases = await listRecentReleases(perPage)
    return {
      message: 'Releases listed.',
      data: { repository: getReleasesRepo(), releases },
    }
  })
