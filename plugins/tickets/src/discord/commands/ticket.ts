import { Template } from '@/class/Template'
import { TemplateBuilder } from '@/class/TemplateBuilder'
import { database } from '@/utils/database'
import { Command, Error } from 'discord'
import { type ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ApplicationCommandType, Colors, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js'


new Command({
  name: 'ticket',
  description: '[ 🎫 Ticket ] Comandos slash dos tickets',
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  dmPermission: false,
  options: [
    {
      name: 'template',
      description: 'Criar template',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'title_create',
          description: 'Título do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'description_create',
          description: 'Descrição do template',
          type: ApplicationCommandOptionType.String,
        },
      ]
    },
    {
      name: 'change',
      description: '🔄 Editar Template',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message_id',
          description: 'Id da mensagem que quer editar',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        },
        {
          name: 'mode',
          description: 'Entrar/Sair do modo edição do template',
          type: ApplicationCommandOptionType.String,
          choices: [
            { name: 'Edição', value: 'debug' },
            { name: 'Produção', value: 'production' }
          ]
        },
        {
          name: 'title',
          description: 'Alterar título do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'description',
          description: 'Alterar descrição do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'thumbnail',
          description: 'Alterar Thumbnail do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'image',
          description: 'Alterar Imagem do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'color',
          description: 'Alterar cor do template',
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        },
        {
          name: 'delete',
          description: 'Deletar template (Apagará a mensagem e os dados do database)',
          type: ApplicationCommandOptionType.Boolean,
        }
      ]
    },
    {
      name: 'manage',
      description: '[ 🎫 Ticket ] Gerenciar os tickets.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'add-user',
          description: '[ 🎫 Ticket ] Adiciona um usuário no ticket atual.',
          type: ApplicationCommandOptionType.User,
          required: false
        },
        {
          name: 'remove-user',
          description: '[ 🎫 Ticket ] Remove um usuário do ticket atual.',
          type: ApplicationCommandOptionType.String,
          autocomplete: true,
          required: false
        },
        {
          name: 'create-call',
          description: '[ 🎫 Ticket ] Criar uma call de suporte para o ticket atual',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        },
        {
          name: 'del-ticket',
          description: '[ 🎫 Ticket ] Força o ticket atual a ser apagado.',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        },
        {
          name: 'del-all-tickets',
          description: '[ 🎫 Ticket ] Deleta todos os tickets!',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        }
      ]
    },
    {
      name: 'category',
      description: '[ 🎫 Ticket ] Add/Rem categorias.',
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: 'add',
          description: '[ 🎫 Ticket ] Add uma categoria para melhor organização.',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'message_id',
              description: 'Id da mensagem que quer editar',
              type: ApplicationCommandOptionType.String,
              required: true,
              autocomplete: true
            },
            {
              name: 'emoji',
              description: '[ 🎫 Ticket ] Emoji que a categoria irá ter.',
              type: ApplicationCommandOptionType.String,
              maxLength: 10,
              required: true
            },
            {
              name: 'title',
              description: '[ 🎫 Ticket ] Nome que será utilizado para classificar a categoria.',
              type: ApplicationCommandOptionType.String,
              required: true,
              maxLength: 25
            }
          ]
        },
        {
          name: 'rem',
          description: '[ 🎫 Ticket ] Add uma categoria para melhor organização.',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'message_id',
              description: 'Id da mensagem que quer editar',
              type: ApplicationCommandOptionType.String,
              required: true,
              autocomplete: true
            },
            {
              name: 'category',
              description: '[ 🎫 Ticket ] Categoria a ser removida.',
              type: ApplicationCommandOptionType.String,
              autocomplete: true,
              required: true
            }
          ]
        }
      ]
    }
  ],
  async autoComplete(interaction) {
    const { options, guildId } = interaction
    const respond: ApplicationCommandOptionChoiceData[] = []
    if (guildId === null) return

    if (options.getSubcommandGroup() !== null) {
      switch(options.getSubcommandGroup()) {
      case 'category': {
        switch (options.getFocused(true).name) {
        case 'message_id': {
          const templateData = await database.template.find({ where: { guild: { guildId: guildId } } })
          respond.push(...templateData.map((template) => ({ name: `${template?.embed?.title ?? template.messageId} | ${template.updateAt}`, value: template.messageId })))
          break 
        }
        case 'category': {
          const messageId = options.data[0].options?.[0].options?.find((option) => option.name === 'message_id')?.value as string | undefined
          console.log(messageId)
          const categories = (await database.template.findOne({ where: { messageId } }))?.categories ?? []
          respond.push(...categories.map((category) => ({ name: `${category.emoji} ${category.title}`, value: category.title })))
          break
        }
        }
        break
      }
      }
    } else {
      switch (options.getFocused(true).name) {
      case 'message_id': {
        const templateData = await database.template.find({ where: { guild: { guildId: guildId } } })
        respond.push(...templateData.map((template) => ({ name: `${template?.embed?.title ?? template.messageId} | ${template.updateAt}`, value: template.messageId })))
        break 
      }
      case 'color': {
        let num = 0
        for (const [color, value] of Object.entries(Colors)) {
          if (num === 25) continue
          if (color.includes('Dark')) continue
          respond.push({ name: color, value: String(value) })
          num++
        }
        break
      }
      }
    }

    await interaction.respond(respond)
  },
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const { options, channelId } = interaction
    
    if (options.getSubcommandGroup() !== null) {
      switch (options.getSubcommandGroup()) {
      case 'category':{
        switch (options.getSubcommand()) {
        case 'add': {
          const emoji = options.getString('emoji', true)
          const title = options.getString('title', true)
          const templateId = options.getString('message_id', true)

          const templateData = await database.template.findOne({ where: { messageId: templateId } })
          if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()
          templateData.categories = [ ...(templateData.categories ?? []), { emoji, title }]

          await new TemplateBuilder({ interaction }).setData(templateData).edit({ messageId: templateId }).then(async () => {
            await interaction.editReply({
              embeds: [new EmbedBuilder({
                title: 'Categoria criada com sucesso!'
              }).setColor('Green')]
            })
            setTimeout(() => interaction.deleteReply(), 5000)
          })
          break
        }
        case 'rem': {
          const title = options.getString('category', true)
          const templateId = options.getString('message_id', true)
          const templateData = await database.template.findOne({ where: { messageId: templateId } })
          if (templateData === null) throw await new Error({ element: 'template', interaction }).notFound({ type: 'Database' }).reply()

          templateData.categories = templateData?.categories.filter((category) => category.title !== title)

          await new TemplateBuilder({ interaction }).setData(templateData).edit({ messageId: templateId }).then(async () => {
            await interaction.editReply({
              embeds: [new EmbedBuilder({
                title: 'Categoria removida com sucesso!'
              }).setColor('Green')]
            })
            setTimeout(() => interaction.deleteReply(), 5000)
          })
        }
        }
        break
      }
      }
    } else {
      switch (options.getSubcommand()) {
      case 'template': {
        if (!interaction.inCachedGuild()) throw await new Error({ element: 'a ação não foi realizada dentro de um servidor', interaction }).notPossible().reply()
        const sendChannel = await interaction.guild.channels.fetch(channelId)
        if (!sendChannel?.isTextBased()) throw await new Error({ element: 'concluir a ação, pois o channel não é um TextBased', interaction }).notPossible().reply()

        const template = new Template({ interaction })
        const title = options.getString('title_create')
        const description = options.getString('description_create')

        if (sendChannel !== undefined) template.create({
          title: title ?? 'Pedir suporte',
          description: description ?? 'Se você estiver precisando de ajuda clique no botão abaixo',
          channelId: sendChannel.id,
          guildId: interaction.guildId
        }).then(async () => await interaction.deleteReply())
        break
      }
      case 'change': {
        const builder = new TemplateBuilder({ interaction })
        const templateId = options.getString('message_id', true)
        const switchMode = options.getString('mode')
        const title = options.getString('title')
        const description = options.getString('description')
        const thumbnail = options.getString('thumbnail')
        const image = options.getString('image')
        const color = options.getString('color')
        const isDelete = options.getBoolean('delete')

        if (isDelete) { await builder.delete({ messageId: templateId }); return }
        if (title !== null) builder.setTitle(title)
        if (description !== null) builder.setDescription(description)
        if (thumbnail !== null) builder.setThumbnail(thumbnail)
        if (image !== null) builder.setImage(image)
        if (color !== null) builder.setColor(color)
        if (switchMode) builder.setMode(switchMode as 'debug' | 'production')

        await builder.edit({ messageId: templateId })
        if (!interaction.replied) await interaction.deleteReply()
        break
      }
      }
    }
  }
})