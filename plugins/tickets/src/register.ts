// Entries

import { Plugins } from 'socket-client'
import * as entries from '../entries.json'

Plugins.setPlugins(entries)

// Crons
import './discord/crons/test.ts'

// Discord
import './discord/commands/ticket.ts'
import './discord/events/joinGuild.ts'
import './discord/events/messageCreate.ts'
import './discord/events/messageDelete.ts'
import './discord/events/leaveVoiceChannel.ts'
import './discord/configs/config.ts'
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
