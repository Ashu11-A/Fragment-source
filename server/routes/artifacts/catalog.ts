import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import {
  classifyArtifact,
  fetchReleaseByTag,
  getReleasesRepo,
} from '@/lib/githubReleases.js'
import { toTrpcError } from '../_shared/errors.js'

const catalogSchema = z.object({
  tag: z.string().min(1),
})

export const catalogArtifactsProcedure = protectedProcedure
  .input(catalogSchema)
  .query(async ({ input }) => {
    try {
      const release = await fetchReleaseByTag(input.tag)

      return {
        repository: getReleasesRepo(),
        tag: release.tag_name,
        assets: release.assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          size: asset.size,
          contentType: asset.content_type,
          kind: classifyArtifact(asset.name),
          downloadUrl: asset.browser_download_url,
        })),
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not load release artifacts catalog')
    }
  })
