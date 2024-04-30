import { db } from '@/app'
import { Command } from '@/discord/base'
import { type Ticket as TicketDBType, type TicketCategories } from '@/interfaces/Ticket'
import { TicketModals, TicketSelects } from '@/discord/components/tickets'
import { TicketPanel } from '@/discord/components/tickets/functions/panelTicket'
import { Ticket } from '@/discord/components/tickets/functions/ticket'
import { type ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js'

new Command({
  name: 'ticket',
  description: '[ 🎫 Ticket ] Abrir Ticket.',
  type: ApplicationCommandType.ChatInput,
  dmPermission,
  options: [
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
  async autoComplete (interaction) {
    const { options, guildId, channelId } = interaction

    if (options.getSubcommandGroup() !== null) {
      switch (options.getSubcommandGroup()) {
        case 'category':
          switch (options.getSubcommand()) {
            case 'rem': {
              const categories = await db.tickets.get(`${guildId}.system.categories`) as TicketCategories[] ?? []
              const respond: Array<ApplicationCommandOptionChoiceData<string | number>> = []

              if (categories !== null && categories.length > 0) {
                for (const category of categories) {
                  respond.push({ name: `${category.emoji} ${category.title}`, value: category.title })
                }
              }
              await interaction.respond(respond)
            }
          }
      }
    } else if (options.getSubcommand() !== null) {
      switch (options.getSubcommand()) {
        case 'manage': {
          switch (options.data[0].options?.[0].name) {
            case 'remove-user': {
              const { users } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
              const user = options.getString('remove-user')
              const respond: Array<ApplicationCommandOptionChoiceData<string | number>> = []
              if (user !== null && users !== undefined) {
                for (const user of users) {
                  respond.push({ name: `${user.displayName} | ${user.name}`, value: user.id })
                }
              }
              await interaction.respond(respond)
            }
          }
        }
      }
    }
  },
  async run (interaction) {
    const { options, channelId } = interaction
    await interaction.deferReply({ ephemeral: true })

    const Constructor = new Ticket({ interaction })
    const PanelConstructor = new TicketPanel({ interaction })
    const ModalConstructor = new TicketModals({ interaction })
    const SelectConstructor = new TicketSelects({ interaction })

    console.log(options.getSubcommand())

    if (options.getSubcommandGroup() != null) {
      switch (options.getSubcommandGroup()) {
        case 'category':
          switch (options.getSubcommand()) {
            case 'add': {
              const emoji = options.getString('emoji', true)
              const title = options.getString('title', true)
              await ModalConstructor.AddCategory({ emoji, title })
              break
            }
            case 'rem': {
              const title = options.getString('category', true)
              await SelectConstructor.RemCategory({ titles: [title] })
            }
          }
          break
      }
      return
    } else if (options.getSubcommand() !== null) {
      switch (options.getSubcommand()) {
        case 'manage': {
          switch (options.data[0].options?.[0].name) {
            case 'add-user': await Constructor.Permissions({ userId: options.getUser('add-user', true).id, channelId }); break
            case 'remove-user': await Constructor.Permissions({ userId: options.getString('remove-user', true), channelId, remove: true }); break
            case 'create-call': await PanelConstructor.CreateCall(); break
            case 'del-ticket': await Constructor.delete({ ask: true }); break
            case 'del-all-tickets':
              break
          }
        }
      }
      return
    }
    await Constructor.create({ title: 'Ticket aberto por meio do comando /ticket' })
  }
})
