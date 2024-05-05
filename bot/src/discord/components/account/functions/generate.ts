import { db } from '@/app'
import { CustomButtonBuilder } from '@/functions'
import { type ModalSubmitInteraction, type CacheType, type ButtonInteraction, type CommandInteraction, type StringSelectMenuInteraction, type ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, type ButtonBuilder, ButtonStyle, type Message } from 'discord.js'

interface GenAccountType {
  interaction: ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | CommandInteraction<CacheType> | StringSelectMenuInteraction<CacheType> | ChatInputCommandInteraction<CacheType>
}

export class GenAccount {
  interaction
  constructor ({ interaction }: GenAccountType) {
    this.interaction = interaction
  }

  public async getData (): Promise<{
    urlPtero: string | undefined
    tokenPtero: string | undefined
    urlCtrl: string | undefined
    tokenCtrl: string | undefined
    pteroUserDB: any
    ctrlUserDB: any
  }> {
    const { guildId, user } = this.interaction
    const { url: urlPtero, tokenPanel: tokenPtero } = (await db.payments.get(
        `${guildId}.config.pterodactyl`
    )) ?? { url: undefined, token: undefined }
    const { url: urlCtrl, token: tokenCtrl } = (await db.payments.get(
        `${guildId}.config.ctrlPanel`
    )) ?? { url: undefined, token: undefined }

    const accounts = await db.accounts.get(`${guildId}.users.${user.id}`)

    return { urlPtero, tokenPtero, urlCtrl, tokenCtrl, pteroUserDB: accounts?.pterodactyl, ctrlUserDB: accounts?.ctrlPanel }
  }

  /**
    * name
    */
  public async genRegister (): Promise<Message<boolean> | undefined> {
    const { interaction } = this
    const { urlCtrl, urlPtero, tokenCtrl, tokenPtero, ctrlUserDB, pteroUserDB } = await this.getData()

    const embed = new EmbedBuilder({
      title: `👋 Olá ${interaction.user.username}, bem vindo ao nosso sistema de registro.`,
      description:
                'Abaixo se encontra os metodos atuais para realizar o registro'
    }).setColor('Blurple')

    const row = new ActionRowBuilder<ButtonBuilder>()
    // const row2 = new ActionRowBuilder<ButtonBuilder>()

    if (urlCtrl !== undefined && tokenCtrl !== undefined) {
      row.addComponents(
        new CustomButtonBuilder({
          permission: 'User',
          type: 'Account',
          label: 'CtrlPanel',
          customId: 'CtrlPanel',
          style: ctrlUserDB !== undefined ? ButtonStyle.Success : ButtonStyle.Secondary,
          emoji: { name: '🖥️' }
        })
      )
      // row2.addComponents(
      //   new ButtonBuilder({
      //     url: urlCtrl,
      //     emoji: { name: '🔗' },
      //     label: 'Ctrl',
      //     style: ButtonStyle.Link,
      //     type: ComponentType.Button
      //   })
      // )
    }

    if (urlPtero !== undefined && tokenPtero !== undefined) {
      row.addComponents(
        new CustomButtonBuilder({
          permission: 'User',
          type: 'Account',
          label: 'Pterodactyl',
          customId: 'Pterodactyl',
          style: pteroUserDB !== undefined ? ButtonStyle.Success : ButtonStyle.Secondary,
          emoji: { name: '🦖' }
        })
      )
      // row2.addComponents(
      //   new ButtonBuilder({
      //     url: urlPtero,
      //     emoji: { name: '🔗' },
      //     label: 'Ptero',
      //     style: ButtonStyle.Link,
      //     type: ComponentType.Button
      //   })
      // )
    }

    if (row.components.length !== 0) {
      return await interaction.editReply({
        embeds: [embed],
        components: [row]
      })
    } else {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: '❌ | Nenhum metodo de registro está configurado!'
          }).setColor('Red')
        ]
      })
    }
  }

  /**
   * genLogin
   */
  public async genLogin (options: {
    disable: {
      ptero?: boolean
      dash?: boolean
    }
  }): Promise<Message<boolean> | undefined> {
    const { interaction } = this
    const { disable } = options
    console.log(disable)
    const { urlCtrl, urlPtero, tokenCtrl, tokenPtero, ctrlUserDB, pteroUserDB } = await this.getData()

    if (disable.dash === true && disable.ptero === true) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: 'Você tem produtos com diferentes características de entrega, no momento isso não é permitido!'
          }).setColor('Red')
        ]
      })
      return
    }

    const embed = new EmbedBuilder({
      title: `👋 Bem vindo ${interaction.user.username}.`,
      description:
        'Abaixo se encontra os metodos atuais para realizar o Login em nossas plataformas'
    }).setColor('Blurple')

    const row = new ActionRowBuilder<ButtonBuilder>()
    // const row2 = new ActionRowBuilder<ButtonBuilder>()

    if ((urlCtrl !== undefined && tokenCtrl !== undefined) && !(disable.dash ?? false)) {
      row.addComponents(
        new CustomButtonBuilder({
          permission: 'User',
          type: 'Cart',
          label: 'CtrlPanel',
          customId: 'CtrlPanel',
          style: ctrlUserDB !== undefined ? ButtonStyle.Success : ButtonStyle.Secondary,
          emoji: { name: '🖥️' }
        })
      )
      // row2.addComponents(
      //   new ButtonBuilder({
      //     url: urlCtrl,
      //     emoji: { name: '🔗' },
      //     label: 'Ctrl',
      //     style: ButtonStyle.Link,
      //     type: ComponentType.Button
      //   })
      // )
    }

    if ((urlPtero !== undefined && tokenPtero !== undefined) && !(disable.ptero ?? false)) {
      row.addComponents(
        new CustomButtonBuilder({
          permission: 'User',
          type: 'Cart',
          label: 'Pterodactyl',
          customId: 'Pterodactyl',
          style: pteroUserDB !== undefined ? ButtonStyle.Success : ButtonStyle.Secondary,
          emoji: { name: '🦖' }
        })
      )
      // row2.addComponents(
      //   new ButtonBuilder({
      //     url: urlPtero,
      //     emoji: { name: '🔗' },
      //     label: 'Ptero',
      //     style: ButtonStyle.Link,
      //     type: ComponentType.Button
      //   })
      // )
    }

    if (row.components.length !== 0) {
      return await interaction.editReply({
        embeds: [embed],
        components: [row]
      })
    } else {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: '❌ | Nenhum metodo de registro está configurado!'
          }).setColor('Red')
        ]
      })
    }
  }
}
