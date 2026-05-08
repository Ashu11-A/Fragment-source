import type { User } from './database/entity/User.js'

export type { AppRouter } from '../routes/index.js'
export { RequestStatus, Role } from './database/enums.js'

export type AuthUser = Omit<
  User,
  | 'password'
  | 'sessions'
  | 'bots'
  | 'subscriptions'
  | 'setPassword'
  | 'validatePassword'
  | 'hasId'
  | 'save'
  | 'remove'
  | 'softRemove'
  | 'recover'
  | 'reload'
>
