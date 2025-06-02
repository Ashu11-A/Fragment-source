import APIRoot from '../routers/index.js'
import CreateBot from '../routers/bots/create.js'
import CreatePlugin from '../routers/plugins/create.js'
import CreateUser from '../routers/users/create.js'
import DeleteBot from '../routers/bots/$id/delete.js'
import DeleteUser from '../routers/users/$id/delete.js'
import DowloadPluginRelease from '../routers/plugins/$id/download.js'
import EditBot from '../routers/bots/$id/update.js'
import EditUser from '../routers/users/$id/edit.js'
import GetDetails from '../routers/bots/$id/get.js'
import GetUser from '../routers/users/$id/get.js'
import GetUserProfile from '../routers/users/profile.js'
import ListBots from '../routers/bots/list.js'
import ListPlugins from '../routers/plugins/list.js'
import ListUsers from '../routers/users/index.js'
import TokenRefresh from '../routers/auth/refresh.js'
import UploadPluginRelease from '../routers/plugins/$id/upload.js'
import UserAuthentication from '../routers/auth/login.js'
import UserLogout from '../routers/auth/logout.js'
import UserRegistration from '../routers/auth/signup.js'

export const routers = {
  '/': APIRoot,
  '/auth/login': UserAuthentication,
  '/auth/logout': UserLogout,
  '/auth/refresh': TokenRefresh,
  '/auth/signup': UserRegistration,
  '/bots': [CreateBot, ListBots],
  '/bots/:id': [DeleteBot, EditBot, GetDetails],
  '/plugins/:id': UploadPluginRelease,
  '/plugins/:id/:version': DowloadPluginRelease,
  '/plugins/create': CreatePlugin,
  '/plugins/list': ListPlugins,
  '/users': [CreateUser, ListUsers],
  '/users/:id': [DeleteUser, EditUser, GetUser],
  '/users/profile': GetUserProfile
}
