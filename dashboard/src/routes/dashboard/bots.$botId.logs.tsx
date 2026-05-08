import { createFileRoute } from '@tanstack/react-router'
import { Download, Trash2, Pause } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, Card, Section } from '@/components/fragment/primitives'
import { cn } from '@/lib/utils'
import { useBot } from '@/hooks/useBots'
import { useBotRouteContext } from '@/routes/hooks/-useBotRouteContext'

export const Route = createFileRoute('/dashboard/bots/$botId/logs')({
  component: BotLogs,
})

const filters = ['All', 'Info', 'Warnings', 'Errors'] as const

type ParsedLine = {
  ts: string
  level: 'INFO' | 'WARN' | 'ERROR'
  msg: string
}

function parseLine(line: string): ParsedLine {
  const match = line.match(/^\[(.*?)\]\s*\[(INFO|WARN|ERROR)\]\s*(.*)$/)
  if (match) {
    return { ts: match[1], level: match[2] as ParsedLine['level'], msg: match[3] }
  }

  if (line.includes('ERROR')) return { ts: '-', level: 'ERROR', msg: line }
  if (line.includes('WARN')) return { ts: '-', level: 'WARN', msg: line }
  return { ts: '-', level: 'INFO', msg: line }
}

function BotLogs() {
  const { botId } = Route.useParams()
  const { bot } = useBotRouteContext(botId)
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [paused, setPaused] = useState(false)
  const stream = useBot('consoleStream', bot?.id, Boolean(bot) && !paused)

  const lines = useMemo(() => {
    const parsed = stream.lines.map(parseLine)
    return parsed.filter((line) => {
      if (filter === 'All') return true
      if (filter === 'Info') return line.level === 'INFO'
      if (filter === 'Warnings') return line.level === 'WARN'
      return line.level === 'ERROR'
    })
  }, [filter, stream.lines])

  return (
    <Section>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
          <div className="flex gap-1">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                  filter === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" variant="ghost" onClick={stream.clear}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
            <Button size="sm" variant="secondary" onClick={() => setPaused((current) => !current)}><Pause className="h-3.5 w-3.5" /> {paused ? 'Resume' : 'Pause'}</Button>
          </div>
        </div>
        <div className="scrollbar-thin max-h-[60vh] overflow-y-auto bg-sidebar-rail/40 p-4 font-mono text-xs leading-relaxed">
          {lines.length === 0 ? (
            <div className="text-muted-foreground">No log output yet.</div>
          ) : (
            lines.map((line, index) => (
              <div key={`${line.ts}-${index}`} className="flex gap-3 py-0.5">
                <span className="text-muted-foreground">[{line.ts}]</span>
                <span className={cn('font-semibold', line.level === 'ERROR' ? 'text-destructive' : line.level === 'WARN' ? 'text-warning' : 'text-success')}>
                  [{line.level}]
                </span>
                <span className="text-foreground">{line.msg}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </Section>
  )
}
