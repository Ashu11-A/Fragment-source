import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBotConsoleStream } from '@/hooks/useBotConsoleStream'
import type { BotCoreConsoleStreamProps } from '@/types/components'

export function BotCoreConsoleStream({ botId, enabled }: BotCoreConsoleStreamProps) {
  const { text, clear } = useBotConsoleStream(botId, enabled)
  const preRef = useRef<HTMLPreElement>(null)
  const stickRef = useRef(true)

  useEffect(() => {
    const el = preRef.current
    if (!el || !stickRef.current) return
    el.scrollTop = el.scrollHeight
  }, [text])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Log stream</CardTitle>
          <p className="text-xs text-surface-500 mt-1 font-normal">
            Saída em tempo real do processo core (stdout/stderr), espelhada em arquivo local e no servidor.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 shrink-0" onClick={() => clear()} title="Limpar só a visualização">
          <Trash2 className="w-3.5 h-3.5" />
          Clear view
        </Button>
      </CardHeader>
      <CardContent>
        <pre
          ref={preRef}
          onScroll={(e) => {
            const t = e.currentTarget
            const nearBottom = t.scrollHeight - t.scrollTop - t.clientHeight < 48
            stickRef.current = nearBottom
          }}
          className="ui-core-console text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words rounded-lg border border-surface-800/80 bg-[#0c0d10] text-surface-200 p-3 max-h-[min(70vh,720px)] overflow-y-auto"
        >
          {text.length > 0 ? text : (
            <span className="text-surface-600">
              Aguardando saída do core… Inicie o core com este bot selecionado para ver o stream aqui.
            </span>
          )}
        </pre>
      </CardContent>
    </Card>
  )
}
