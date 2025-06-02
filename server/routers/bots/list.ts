import { Router } from '@/controllers/router.js'
import { repository } from '@/database'
import { Role } from '@/database/enums'
import { paginate, paginateQuery } from '@/database/pagination'

export default new Router({
  name: 'ListBots',
  path: '/bots',
  description: 'List the bots, if you are an administrator you can list everything',
  authenticate: true,
  query: {
    get: [...paginateQuery, 'type']
  },
  methods: {
    async get({ reply, request, query }) {
      const page = Math.max(1, Number(query.page) || 1)
      const pageSize = Math.max(1, Number(query.pageSize) || 1)
      const type = ['your', 'other'].includes(query.interval ?? '') ? query.interval as string : 'your'
      const isAdmin = request.user.role === Role.Administrator

      const paginated = await paginate({
        repository: repository.bot,
        page,
        pageSize,
        user: (isAdmin && type === 'other') ? undefined : { id: request.user.id }
      })
      
      return reply.status(200).send({
        message: 'Request completed successfully!',
        ...paginated
      })
    }
  }
})