import type { PluginContext } from 'discord'

export default function register(ctx: PluginContext): void {
  ctx.cron({
    name: '',
    cron: '',
    exec() {
      // placeholder
    },
  })
}
