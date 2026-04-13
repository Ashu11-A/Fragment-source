import { Router } from '@/controllers/router.js'
import { repository } from '@/database'
import { paginate, paginateQuery } from '@/database/pagination'

export default new Router({
  name: 'ListPlugins',
  description: 'List Plugins',
  authenticate: true,
  query: {
    get: paginateQuery
  },
  methods: {
    async get({ reply, query }) {
      const page = Math.max(1, Number(query.page) || 1)
      const pageSize = Math.max(1, Number(query.pageSize) || 1)
    
      const paginated = await paginate({
        page,
        pageSize,
        repository: repository.plugin,
      })
  
      return reply.status(200).send({
        message: 'Plugin list request successful!',
        ...paginated
      })
    }
  }
})