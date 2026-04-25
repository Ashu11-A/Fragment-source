import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/bots_/$botId')({
  component: BotIdLayout,
})

function BotIdLayout() {
  return <Outlet />
}
