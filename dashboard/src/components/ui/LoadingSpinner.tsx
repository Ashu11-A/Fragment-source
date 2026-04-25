import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  paddingY?: string
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function LoadingSpinner({ text, size = 'md', paddingY = 'py-20' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${paddingY}`}>
      <Loader2 className={`${sizeMap[size]} text-blurple-400 animate-spin`} />
      {text && <span className="ml-2 text-sm text-surface-400">{text}</span>}
    </div>
  )
}
