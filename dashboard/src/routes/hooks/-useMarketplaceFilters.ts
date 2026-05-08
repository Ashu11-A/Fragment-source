import { useMemo, useState } from 'react'
import { usePlugin } from '@/hooks/usePlugin'
import type { RouterOutputs } from '@/lib/trpc'

export const marketplacePrices = ['All', 'Free', 'Paid'] as const
export const marketplaceSorts = ['Newest', 'Price: Low to High', 'Price: High to Low'] as const

export type MarketplacePrice = (typeof marketplacePrices)[number]
export type MarketplaceSort = (typeof marketplaceSorts)[number]
export type MarketplacePlugin = RouterOutputs['plugins']['marketplaceList'][number]

export function useMarketplaceFilters() {
  const { search: query, setSearch: setQuery, plugins, isLoading, isFetching, error, openCheckout, installPlugin, isCreatingCheckout, isInstallingPlugin, checkoutLoadingPluginId, installLoadingPluginId } = usePlugin('marketplace')

  const categories = useMemo(() => {
    const values = new Set<string>(['All'])
    for (const plugin of plugins) {
      const creator = plugin.creator?.username?.trim()
      if (creator && creator.length > 0) values.add(creator)
    }
    return [...values]
  }, [plugins])

  const [category, setCategory] = useState<string>('All')
  const [price, setPrice] = useState<MarketplacePrice>('All')
  const [sort, setSort] = useState<MarketplaceSort>('Newest')

  const filteredPlugins = useMemo(() => {
    let list = [...plugins]

    if (category !== 'All') {
      list = list.filter((plugin) => plugin.creator?.username === category)
    }

    if (price === 'Free') {
      list = list.filter((plugin) => plugin.price === 0)
    } else if (price === 'Paid') {
      list = list.filter((plugin) => plugin.price > 0)
    }

    if (sort === 'Price: Low to High') {
      list.sort((leftPlugin, rightPlugin) => leftPlugin.price - rightPlugin.price)
    } else if (sort === 'Price: High to Low') {
      list.sort((leftPlugin, rightPlugin) => rightPlugin.price - leftPlugin.price)
    }

    return list
  }, [category, plugins, price, sort])

  return {
    query,
    category,
    price,
    sort,
    categories,
    filteredPlugins,
    isLoading,
    isFetching,
    error,
    openCheckout,
    installPlugin,
    isCreatingCheckout,
    isInstallingPlugin,
    checkoutLoadingPluginId,
    installLoadingPluginId,
    setQuery,
    setCategory,
    setPrice,
    setSort,
  }
}
