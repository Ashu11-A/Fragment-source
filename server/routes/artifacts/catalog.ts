import { z } from 'zod'
import {
  classifyArtifact,
  fetchReleaseByTag,
  getDefaultReleaseTag,
  getReleasesRepo,
  pluginSlugFromFileName,
} from '@/lib/githubReleases.js'
import { protectedProcedure } from '@/trpc.js'

export const catalog = protectedProcedure
  .input(
    z.object({
      tag: z.string().min(1).max(200).optional(),
    }).optional(),
  )
  .query(async ({ input }) => {
    const tag = input?.tag ?? getDefaultReleaseTag()
    const release = await fetchReleaseByTag(tag)

    const items = release.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      size: asset.size,
      kind: classifyArtifact(asset.name),
      contentType: asset.content_type,
      downloadUrl: asset.browser_download_url,
      pluginSlug: pluginSlugFromFileName(asset.name),
    }))

    return {
      message: 'Catalog ready.',
      data: {
        repository: getReleasesRepo(),
        defaultTag: getDefaultReleaseTag(),
        tag: release.tag_name,
        releaseName: release.name,
        publishedAt: release.published_at,
        body: release.body,
        htmlUrl: release.html_url,
        assets: items,
      },
    }
  })
