import { create } from 'zustand'

export interface BotsListUIState {
  search: string
  setSearch: (search: string) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
  editOpen: boolean
  setEditOpen: (open: boolean) => void
  deleteOpen: boolean
  setDeleteOpen: (open: boolean) => void
  botName: string
  setBotName: (name: string) => void
  editBotId: number | null
  setEditBotId: (id: number | null) => void
  editBotName: string
  setEditBotName: (name: string) => void
  deleteBotId: number | null
  setDeleteBotId: (id: number | null) => void
  deleteBotName: string
  setDeleteBotName: (name: string) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  error: string
  setError: (error: string) => void
  resetListDialogs: () => void
}

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
      editBotId: null,
      editBotName: '',
      deleteBotId: null,
      deleteBotName: '',
      error: '',
    }),
}))
