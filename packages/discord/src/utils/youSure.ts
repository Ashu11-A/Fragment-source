import {
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  type ButtonInteraction,
  type CacheType,
  type CommandInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js'
import { ActionDrawer } from './actionDrawer'
import { ButtonBuilder } from './fragmentComponents'
import { toPluginComponentPath } from './pluginComponentPath.js'

type Interaction =
  | CommandInteraction<CacheType>
  | ModalSubmitInteraction<CacheType>
  | ButtonInteraction<CacheType>
  | StringSelectMenuInteraction<CacheType>

const CONFIRM_SUFFIX = 'confirm-button'
const CANCEL_SUFFIX = 'cancel-button'

/**
 * Diálogo de confirmação com dois botões (customId prefixado pelo plugin, como demais componentes Fragment).
 */
export class YouSure {
  private readonly interaction: Interaction
  private readonly title?: string

  constructor ({ interaction, title }: { interaction: Interaction, title?: string }) {
    this.interaction = interaction
    this.title = title
  }

  async question (): Promise<boolean> {
    const confirmId = toPluginComponentPath(CONFIRM_SUFFIX)
    const cancelId = toPluginComponentPath(CANCEL_SUFFIX)

    const embed = new EmbedBuilder({
      title: this.title ?? 'Tem certeza que deseja fazer isso?',
    }).setColor('Orange')

    const buttons = ActionDrawer([
      new ButtonBuilder({ customId: CONFIRM_SUFFIX, label: 'Confirmar', style: ButtonStyle.Success }),
      new ButtonBuilder({ customId: CANCEL_SUFFIX, label: 'Cancelar', style: ButtonStyle.Danger }),
    ])

    const message = this.interaction.deferred
      ? await this.interaction.editReply({ embeds: [embed], components: buttons })
      : await this.interaction.reply({ embeds: [embed], components: buttons })

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) =>
        i.user.id === this.interaction.user.id &&
        (i.customId === confirmId || i.customId === cancelId),
      max: 1,
      time: 120_000,
    })

    return await new Promise<boolean>((resolve) => {
      let settled = false
      const finish = (value: boolean) => {
        if (settled) return
        settled = true
        resolve(value)
      }

      collector.once('collect', async (subInteraction) => {
        if (subInteraction.customId === confirmId) {
          finish(true)
          return
        }

        if (subInteraction.customId === cancelId) {
          const cancelled = new EmbedBuilder({ title: 'Ação cancelada!' }).setColor('Red')
          await subInteraction
            .update({ embeds: [cancelled], components: [] })
            .catch(async () => {
              if (subInteraction.deferred) {
                await this.interaction.editReply({ embeds: [cancelled], components: [] })
                return
              }
              await this.interaction.reply({
                ephemeral: true,
                embeds: [cancelled],
                components: [],
              })
            })
          setTimeout(async () => {
            await subInteraction.deleteReply().catch(() => undefined)
          }, 5000)
          finish(false)
        }
      })

      collector.once('end', (_, reason) => {
        if (reason === 'time') finish(false)
      })
    })
  }
}
