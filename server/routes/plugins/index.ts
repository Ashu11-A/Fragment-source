import { router } from '@/trpc.js'
import { createCheckoutProcedure } from './createCheckout.js'
import { createPackageSubmissionProcedure } from './createPackageSubmission.js'
import { createPackagePublishRequestProcedure } from './createPackagePublishRequest.js'
import { createPluginProcedure } from './create.js'
import { createPluginSubmissionProcedure } from './createSubmission.js'
import { createPublishRequestProcedure } from './createPublishRequest.js'
import { creatorStatsProcedure } from './creatorStats.js'
import { decidePublishRequestProcedure } from './decidePublishRequest.js'
import { deletePublishRequestProcedure } from './deletePublishRequest.js'
import { downloadPublishRequestProcedure } from './downloadPublishRequest.js'
import { finalizeCheckoutProcedure } from './finalizeCheckout.js'
import { getPluginProcedure } from './get.js'
import { listPluginsProcedure } from './list.js'
import { listPublishRequestsProcedure } from './listPublishRequests.js'
import { marketplaceListProcedure } from './marketplaceList.js'
import { updatePublishRequestProcedure } from './updatePublishRequest.js'
import { updatePluginProcedure } from './updatePlugin.js'
import { updateReleaseEnvsProcedure } from './updateReleaseEnvs.js'

export const pluginsRouter = router({
  get: getPluginProcedure,
  list: listPluginsProcedure,
  create: createPluginProcedure,
  createPackageSubmission: createPackageSubmissionProcedure,
  createPackagePublishRequest: createPackagePublishRequestProcedure,
  createSubmission: createPluginSubmissionProcedure,
  update: updatePluginProcedure,
  updateReleaseEnvs: updateReleaseEnvsProcedure,
  marketplaceList: marketplaceListProcedure,
  createPublishRequest: createPublishRequestProcedure,
  updatePublishRequest: updatePublishRequestProcedure,
  decidePublishRequest: decidePublishRequestProcedure,
  deletePublishRequest: deletePublishRequestProcedure,
  downloadPublishRequest: downloadPublishRequestProcedure,
  listPublishRequests: listPublishRequestsProcedure,
  creatorStats: creatorStatsProcedure,
  createCheckout: createCheckoutProcedure,
  finalizeCheckout: finalizeCheckoutProcedure,
})
