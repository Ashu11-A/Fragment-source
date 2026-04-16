import type { PluginContext } from 'discord'

export default function cronsTest (ctx: PluginContext) {
  ctx.cron({
    name: '',
    cron: '',
    exec() {
      // placeholder
    },
  })
}
