import { Entry } from 'socket-client'
import { Package } from 'utils'
import pkg from '../package.json'
Package.setData(pkg)
import * as Claim from './entity/Claim.entry.ts' with { type: 'text' }
import * as Config from './entity/Config.entry.ts' with { type: 'text' }
import * as Ticket from './entity/Ticket.entry.ts' with { type: 'text' }
import * as Template from './entity/Template.entry.ts' with { type: 'text' }
import * as Guild from './entity/Guild.entry.ts' with { type: 'text' }

Entry.setEntries({
  'Claim.entry.ts': Claim as unknown as string,
  'Config.entry.ts': Config as unknown as string,
  'Ticket.entry.ts': Ticket as unknown as string,
  'Template.entry.ts': Template as unknown as string,
  'Guild.entry.ts': Guild as unknown as string,
})

// Commands
import './discord/commands/ticket.ts'

// Events
import './discord/events/joinGuild.ts'
import './discord/events/messageCreate.ts'
import './discord/events/messageDelete.ts'
import './discord/events/leaveVoiceChannel.ts'

// Configs
import './discord/configs/config.ts'

// Crons
import './discord/crons/test.ts'

// Components
import './discord/components/Claim/ButtonDel.ts'
import './discord/components/Claim/ButtonClaim.ts'
import './discord/components/Claim/ButtonTranscript.ts'
import './discord/components/Ticket/ActionsClose.ts'
import './discord/components/Ticket/ButtonSwitch.ts'
import './discord/components/Template/SelectEditMenu.ts'
import './discord/components/Template/ButtonConfig.ts'
import './discord/components/Template/ButtonCategory.ts'
import './discord/components/Template/OpenActions.ts'
import './discord/components/Template/ButtonMoreDetails.ts'
import './discord/components/Template/AddSelectActions.ts'
import './discord/components/Template/ButtonSave.ts'
import './discord/components/Template/ButtonsSetType.ts'
import './discord/components/Template/ButtonDelete.ts'
import './discord/components/Template/EditTicket.ts'
import './discord/components/Ticket/Panel/SelectPanel.ts'
import './discord/components/Ticket/Panel/ButtonPanel.ts'