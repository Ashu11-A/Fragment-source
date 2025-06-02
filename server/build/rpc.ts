/* eslint-disable @typescript-eslint/no-explicit-any */
import type { z } from 'zod'
import type { Router } from '../src/controllers/router.js'
import type APIRoot from '../routers/index.js'
import type CreateBot from '../routers/bots/create.js'
import type CreatePlugin from '../routers/plugins/create.js'
import type CreateUser from '../routers/users/create.js'
import type DeleteBot from '../routers/bots/$id/delete.js'
import type DeleteUser from '../routers/users/$id/delete.js'
import type DowloadPluginRelease from '../routers/plugins/$id/download.js'
import type EditBot from '../routers/bots/$id/update.js'
import type EditUser from '../routers/users/$id/edit.js'
import type GetDetails from '../routers/bots/$id/get.js'
import type GetUser from '../routers/users/$id/get.js'
import type GetUserProfile from '../routers/users/profile.js'
import type ListBots from '../routers/bots/list.js'
import type ListPlugins from '../routers/plugins/list.js'
import type ListUsers from '../routers/users/index.js'
import type TokenRefresh from '../routers/auth/refresh.js'
import type UploadPluginRelease from '../routers/plugins/$id/upload.js'
import type UserAuthentication from '../routers/auth/login.js'
import type UserLogout from '../routers/auth/logout.js'
import type UserRegistration from '../routers/auth/signup.js'

type MergeUnion<T> = (T extends any ? (x: T) => void : never) extends (x: infer R) => void ? { [K in keyof R]: R[K] }: never
type UnwrapPromise<T> = T extends Promise<any> ? Awaited<T> : T
type FirstParameter<T> = T extends Router<infer First, any, any, any> ? First : never


export type Routers = {
  '/': {
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof APIRoot.methods.post>>>,
      request: z.infer<NonNullable<typeof APIRoot.schema>['post']>,
      auth: undefined
    }
  },
  '/auth/login': {
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof UserAuthentication.methods.post>>>,
      request: z.infer<NonNullable<typeof UserAuthentication.schema>['post']>,
      auth: undefined
    }
  },
  '/auth/logout': {
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof UserLogout.methods.post>>>,
      request: undefined,
      auth: FirstParameter<typeof UserLogout>
    }
  },
  '/auth/refresh': {
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof TokenRefresh.methods.post>>>,
      request: undefined,
      auth: undefined
    }
  },
  '/auth/signup': {
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof UserRegistration.methods.post>>>,
      request: z.infer<NonNullable<typeof UserRegistration.schema>['post']>,
      auth: undefined
    }
  },
  '/bots': {
    get: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof ListBots.methods.get>>>,
      request: undefined,
      auth: FirstParameter<typeof ListBots>
    },
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof CreateBot.methods.post>>>,
      request: z.infer<NonNullable<typeof CreateBot.schema>['post']>,
      auth: FirstParameter<typeof CreateBot>
    }
  },
  '/bots/:id': {
    delete: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof DeleteBot.methods.delete>>>,
      request: undefined,
      auth: FirstParameter<typeof DeleteBot>
    },
    get: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof GetDetails.methods.get>>>,
      request: undefined,
      auth: undefined
    },
    put: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof EditBot.methods.put>>>,
      request: z.infer<NonNullable<typeof EditBot.schema>['put']>,
      auth: FirstParameter<typeof EditBot>
    }
  },
  '/plugins/:id': {
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof UploadPluginRelease.methods.post>>>,
      request: undefined,
      auth: FirstParameter<typeof UploadPluginRelease>
    }
  },
  '/plugins/:id/:version': {
    get: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof DowloadPluginRelease.methods.get>>>,
      request: undefined,
      auth: FirstParameter<typeof DowloadPluginRelease>
    }
  },
  '/plugins/create': {
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof CreatePlugin.methods.post>>>,
      request: z.infer<NonNullable<typeof CreatePlugin.schema>['post']>,
      auth: FirstParameter<typeof CreatePlugin>
    }
  },
  '/plugins/list': {
    get: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof ListPlugins.methods.get>>>,
      request: undefined,
      auth: FirstParameter<typeof ListPlugins>
    }
  },
  '/users': {
    get: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof ListUsers.methods.get>>>,
      request: undefined,
      auth: FirstParameter<typeof ListUsers>
    },
    post: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof CreateUser.methods.post>>>,
      request: z.infer<NonNullable<typeof CreateUser.schema>['post']>,
      auth: FirstParameter<typeof CreateUser>
    }
  },
  '/users/:id': {
    delete: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof DeleteUser.methods.delete>>>,
      request: undefined,
      auth: FirstParameter<typeof DeleteUser>
    },
    get: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof GetUser.methods.get>>>,
      request: undefined,
      auth: FirstParameter<typeof GetUser>
    },
    put: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof EditUser.methods.put>>>,
      request: z.infer<NonNullable<typeof EditUser.schema>['put']>,
      auth: FirstParameter<typeof EditUser>
    }
  },
  '/users/profile': {
    get: {
      response: MergeUnion<UnwrapPromise<ReturnType<typeof GetUserProfile.methods.get>>>,
      request: undefined,
      auth: FirstParameter<typeof GetUserProfile>
    }
  }
}