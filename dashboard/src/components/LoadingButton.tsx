import { Loader2 } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean
}

export function LoadingButton({ isLoading = false, disabled, children, ...props }: LoadingButtonProps) {
  return (
    <Button {...props} disabled={disabled || isLoading}>
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </Button>
  )
}
