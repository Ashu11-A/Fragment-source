import { createFileRoute } from '@tanstack/react-router'
import { BotLogsPage } from '@/pages/BotLogsPage'

export const Route = createFileRoute('/_authenticated/bots_/$botId/logs')({
  component: BotLogsPage,
})
