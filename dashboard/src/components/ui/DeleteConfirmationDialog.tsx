import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorAlert } from '@/components/ui/ErrorAlert'

interface DeleteConfirmationDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  error?: string
  confirmLabel?: string
}

export function DeleteConfirmationDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
  error,
  confirmLabel = 'Delete',
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ErrorAlert error={error} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
