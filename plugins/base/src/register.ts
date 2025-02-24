import { Entry } from 'socket-client'
import { Package } from 'utils'
import pkg from '../package.json'
Package.setData(pkg)
import * as Config from './entity/Config.entry.ts' with { type: 'text' }
import * as User from './entity/User.entry.ts' with { type: 'text' }
import * as Guild from './entity/Guild.entry.ts' with { type: 'text' }

Entry.setEntries({
  'Config.entry.ts': Config as unknown as string,
  'User.entry.ts': User as unknown as string,
  'Guild.entry.ts': Guild as unknown as string,
})

// Commands
import './discord/commands/teste.ts'

// Events
import './discord/events/joinGuild.ts'

// Components
import './discord/components/test.ts'

// Configs

// Crons