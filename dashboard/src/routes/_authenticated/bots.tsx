import { createFileRoute } from '@tanstack/react-router'
import { BotsPage } from '@/pages/BotsPage'

export const Route = createFileRoute('/_authenticated/bots')({
  component: BotsPage,
})
