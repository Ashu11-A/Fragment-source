interface PageHeaderProps {
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between animate-slide-up">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-6 h-6 text-blurple-400" />}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <p className="text-surface-400 text-sm">{description}</p>
      </div>
      {actions}
    </div>
  )
}
