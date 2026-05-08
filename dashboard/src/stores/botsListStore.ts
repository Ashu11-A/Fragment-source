import { create } from 'zustand'
import type { BotsListUIState } from '@/types/stores'

export type { BotsListUIState } from '@/types/stores'

export const useBotsListStore = create<BotsListUIState>((set) => ({
  search: '',
  setSearch: (search) => set({ search }),
  createOpen: false,
  setCreateOpen: (createOpen) => set({ createOpen }),
  editOpen: false,
  setEditOpen: (editOpen) => set({ editOpen }),
  deleteOpen: false,
  setDeleteOpen: (deleteOpen) => set({ deleteOpen }),
  botName: '',
  setBotName: (botName) => set({ botName }),
  selectedNodeId: '',
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  editBotId: null,
  setEditBotId: (editBotId) => set({ editBotId }),
  editBotName: '',
  setEditBotName: (editBotName) => set({ editBotName }),
  deleteBotId: null,
  setDeleteBotId: (deleteBotId) => set({ deleteBotId }),
  deleteBotName: '',
  setDeleteBotName: (deleteBotName) => set({ deleteBotName }),
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: '',
  setError: (error) => set({ error }),
  resetListDialogs: () =>
    set({
      createOpen: false,
      editOpen: false,
      deleteOpen: false,
      botName: '',
      selectedNodeId: '',
      editBotId: null,
      editBotName: '',
      deleteBotId: null,
      deleteBotName: '',
      error: '',
    }),
}))
