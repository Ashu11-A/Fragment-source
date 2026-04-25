import { createFileRoute } from '@tanstack/react-router'
import { BotPluginsPage } from '@/pages/BotPluginsPage'

export const Route = createFileRoute('/_authenticated/bots_/$botId/plugins')({
  component: BotPluginsPage,
})
