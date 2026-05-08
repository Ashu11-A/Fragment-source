import { useBot } from '@/hooks/useBots'

export function useBotRouteContext(botId: string) {
  const detail = useBot('detail', botId, { enableStatusPolling: true })

  return {
    bot: detail.bot,
    isOnline: detail.isOnline,
    isLoading: detail.isLoading,
    isFetching: detail.isFetching,
    isError: detail.isError,
    error: detail.error,
    refetch: detail.refetch,
  }
}
