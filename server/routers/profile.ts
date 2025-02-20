import { Router } from '@/controllers/router.js'

export default new Router({
  name: 'Profile',
  description: 'Profile Details',
  authenticate: true,
  get({ request, reply }) {
    return reply.status(200).send({
      message: 'Request completed successfully!',
      data: request.user
    })
  }
})