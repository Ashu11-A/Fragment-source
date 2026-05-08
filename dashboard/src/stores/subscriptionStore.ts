import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SubscriptionState } from '@/types/stores'

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      pageCount: 0,
      isLoading: false,
      isFetched: false,

      setData: (data) =>
        set({
          items: data.items,
          total: data.total,
          page: data.page,
          limit: data.limit,
          pageCount: data.pageCount,
          isFetched: true,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
      setFetched: (fetched) => set({ isFetched: fetched }),
    }),
    {
      name: 'fragment-subscription',
      partialize: (state) => ({
        items: state.items,
        total: state.total,
        page: state.page,
        limit: state.limit,
        pageCount: state.pageCount,
        isFetched: state.isFetched,
      }),
    },
  ),
)
