import { useState } from 'react'
import type { DialogState } from '@/types/app'

export function useDialogState<TData = undefined>(
  initialData?: TData,
): DialogState<TData> {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<TData | undefined>(initialData)

  const open = (newData?: TData) => {
    if (newData !== undefined) setData(newData)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setData(initialData)
  }

  return { isOpen, setIsOpen, data, setData, open, close }
}
