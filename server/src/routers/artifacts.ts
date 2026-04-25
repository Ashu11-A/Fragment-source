import { z } from 'zod'
import {
  classifyArtifact,
  fetchReleaseByTag,
  getDefaultReleaseTag,
  getReleasesRepo,
  listRecentReleases,
  pluginSlugFromFileName,
} from '../lib/githubReleases.js'
import { protectedProcedure, router } from '../trpc.js'

export const artifactsRouter = router({
  /**
   * Catálogo de binários (core, plugins, metadata) para um tag de release.
   * Dados vêm da API pública do GitHub (repositório configurável por env).
   */
  catalog: protectedProcedure
    .input(
      z
        .object({
          tag: z.string().min(1).max(200).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const tag = input?.tag ?? getDefaultReleaseTag()
      const release = await fetchReleaseByTag(tag)

      const items = release.assets.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        kind: classifyArtifact(a.name),
        contentType: a.content_type,
        downloadUrl: a.browser_download_url,
        pluginSlug: pluginSlugFromFileName(a.name),
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
    }),

  /**
   * Lista de releases recentes (para o seletor de versão no dashboard).
   */
  releaseList: protectedProcedure
    .input(
      z
        .object({
          perPage: z.number().int().min(1).max(30).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const perPage = input?.perPage ?? 20
      const releases = await listRecentReleases(perPage)
      return {
        message: 'Releases listed.',
        data: { repository: getReleasesRepo(), releases },
      }
    }),
})
