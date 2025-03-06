import type { z } from 'zod'
import { type TypedReply } from './types/router.js'
import Home from '../routers/index.js'
import Profile from '../routers/profile.js'
import GetDetails from '../routers/bot/uuid.js'
import ListBots from '../routers/bot/list.js'
import DeleteBot from '../routers/bot/delete.js'
import EditBot from '../routers/bot/update.js'
import CreateBot from '../routers/bot/create.js'
import refresh from '../routers/auth/refresh.js'
import UserRegistration from '../routers/auth/signup.js'
import logout from '../routers/auth/logout.js'
import UserLogin from '../routers/auth/login.js'
import ListPlugins from '../routers/plugin/list.js'
import CreatePlugin from '../routers/plugin/create.js'
import UploadPluginRelease from '../routers/plugin/upload/id.js'
import DowloadPluginRelease from '../routers/plugin/download/id.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MergeUnion<T> = (T extends any ? (x: T) => void : never) extends (x: infer R) => void ? { [K in keyof R]: R[K] }: never
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnwrapPromise<T> = T extends Promise<any> ? Awaited<T> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractTData<T> = T extends TypedReply<infer U, any> ? U : never


export type Routers = {
  '/': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof Home.methods.post>>>>,
      'request': z.infer<NonNullable<typeof Home.schema>['post']>
    }
  },
  '/profile': {
    'get': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof Profile.methods.get>>>>
    }
  },
  '/bot/:uuid': {
    'get': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof GetDetails.methods.get>>>>
    }
  },
  '/bot/list': {
    'get': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof ListBots.methods.get>>>>,
      'request': z.infer<NonNullable<typeof ListBots.schema>['get']>
    }
  },
  '/bot/delete': {
    'delete': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof DeleteBot.methods.delete>>>>,
      'request': z.infer<NonNullable<typeof DeleteBot.schema>['delete']>
    }
  },
  '/bot/update': {
    'put': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof EditBot.methods.put>>>>,
      'request': z.infer<NonNullable<typeof EditBot.schema>['put']>
    }
  },
  '/bot/create': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof CreateBot.methods.post>>>>,
      'request': z.infer<NonNullable<typeof CreateBot.schema>['post']>
    }
  },
  '/auth/refresh': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof refresh.methods.post>>>>
    }
  },
  '/auth/signup': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof UserRegistration.methods.post>>>>,
      'request': z.infer<NonNullable<typeof UserRegistration.schema>['post']>
    }
  },
  '/auth/logout': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof logout.methods.post>>>>
    }
  },
  '/auth/login': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof UserLogin.methods.post>>>>,
      'request': z.infer<NonNullable<typeof UserLogin.schema>['post']>
    }
  },
  '/plugin/list': {
    'get': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof ListPlugins.methods.get>>>>
    }
  },
  '/plugin/create': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof CreatePlugin.methods.post>>>>,
      'request': z.infer<NonNullable<typeof CreatePlugin.schema>['post']>
    }
  },
  '/plugin/upload/:id': {
    'post': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof UploadPluginRelease.methods.post>>>>
    }
  },
  '/plugin/download/:id': {
    'get': {
      'response': MergeUnion<ExtractTData<UnwrapPromise<ReturnType<typeof DowloadPluginRelease.methods.get>>>>
    }
  }
}
