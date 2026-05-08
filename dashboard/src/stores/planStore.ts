import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlanState } from '@/types/stores'

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plans: [],
      isLoading: false,
      isFetched: false,

      setPlans: (plans) => set({ plans, isFetched: true, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
      setFetched: (fetched) => set({ isFetched: fetched }),
    }),
    {
      name: 'fragment-plans',
      partialize: (state) => ({
        plans: state.plans,
        isFetched: state.isFetched,
      }),
    },
  ),
)
