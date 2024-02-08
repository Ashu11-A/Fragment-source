import { Database, type DatabaseType } from '@/functions'
import { type SystemCustomIdHandlers } from '@/interfaces'
import { type ButtonInteraction, type CacheType } from 'discord.js'
import { showModal } from './systemCollector/showModal'

export async function systemCollectorButtons (options: {
  interaction: ButtonInteraction<CacheType>
  key: string
}): Promise<void> {
  const { interaction, key } = options

  const customIdHandlers: SystemCustomIdHandlers = {
    Ticket: { info: 'Tickets' },
    Payments: { info: 'Pagamentos' },
    Welcomer: { info: 'Boas vindas' },
    Status: { info: 'Status' },
    DeleteServers: { info: 'Deletar Servidores' },
    TelegramNotif: { info: 'Notificação via Telegram' },
    StatusMinecraft: { info: 'Status', remove: 'StatusString' },
    StatusString: { info: 'Status', remove: 'StatusMinecraft' },
    Logs: { info: 'Logs' },
    StatusOnline: { type: 'StatusType', info: 'online' },
    StatusAusente: { type: 'StatusType', info: 'idle' },
    StatusNoPerturbe: { type: 'StatusType', info: 'dnd' },
    StatusInvisível: { type: 'StatusType', info: 'invisible' },
    PteroStatus: { info: 'de Status do Pterodactyl' },
    PteroTimeout: { type: 'Modal' }
  }

  const customIdHandler = customIdHandlers[key]

  if (typeof customIdHandler === 'object') {
    const commonParams = {
      systemName: key,
      displayName: customIdHandler.info
    }
    const commonDatabase: DatabaseType = {
      interaction,
      typeDB: 'system',
      pathDB: 'status'
    }

    if (customIdHandler.type === 'Modal') {
      await showModal({ interaction, key })
      return
    }

    await interaction.deferReply({ ephemeral })

    if (customIdHandler.type !== undefined && customIdHandler.info !== undefined) {
      await new Database({ ...commonDatabase }).setDelete({
        ...commonParams,
        systemName: customIdHandler.type,
        enabledType: customIdHandler.info
      })
    } else if (customIdHandler.remove !== undefined) {
      await new Database({ ...commonDatabase }).setDelete({
        ...commonParams,
        enabledType: 'swap',
        otherSystemNames: [customIdHandler.remove]
      })
    } else {
      await new Database({ ...commonDatabase }).setDelete({
        ...commonParams,
        enabledType: 'switch'
      })
    }
  }
}
