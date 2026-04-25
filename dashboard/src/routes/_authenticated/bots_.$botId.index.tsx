import { createFileRoute } from '@tanstack/react-router'
import { BotDashboardPage } from '@/pages/BotDashboardPage'

export const Route = createFileRoute('/_authenticated/bots_/$botId/')({
  component: BotDashboardPage,
})
