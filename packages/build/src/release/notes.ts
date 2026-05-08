import { type ReleaseIndex } from '../types'

export function generateReleaseNotes(releaseIndex: ReleaseIndex): string {
  const lines: string[] = [
    `## Fragment v${releaseIndex.version}`,
    '',
    `> Publicado em: ${new Date(releaseIndex.publishedAt).toLocaleDateString('pt-BR')}`,
    '',
  ]

  if (releaseIndex.plugins.length > 0) {
    lines.push('## Plugins', '')

    for (const plugin of releaseIndex.plugins) {
      const meta = plugin.manifest?.metadata
      lines.push(`### ${meta?.name ?? plugin.name} \`v${plugin.version}\``)
      if (meta?.description) lines.push('', `> ${meta.description}`)
      lines.push('')

      if (plugin.manifest?.commands.length) {
        lines.push('**Slash Commands**', '')
        for (const command of plugin.manifest.commands) {
          if (command.subcommands.length === 0 && command.groups.length === 0) {
            lines.push(`- \`/${command.name}\`${command.description ? ` — ${command.description}` : ''}`)
          } else {
            lines.push(`- \`/${command.name}\``)
            for (const subcommand of command.subcommands) {
              lines.push(`  - \`/${command.name} ${subcommand.name}\` — ${subcommand.description}`)
            }
            for (const subcommandGroup of command.groups) {
              lines.push(`  - \`/${command.name} ${subcommandGroup.name}\``)
              for (const subcommand of subcommandGroup.subcommands) {
                lines.push(`    - \`/${command.name} ${subcommandGroup.name} ${subcommand.name}\` — ${subcommand.description}`)
              }
            }
          }
        }
        lines.push('')
      }

      if (plugin.manifest?.components.length) {
        lines.push(`**Componentes** (${plugin.manifest.components.length})`, '')
        for (const component of plugin.manifest.components) {
          lines.push(`- \`${component.customId}\` [${component.types.join(', ')}]`)
        }
        lines.push('')
      }

      if (plugin.manifest?.events.length) {
        lines.push(`**Eventos** (${plugin.manifest.events.length})`, '')
        for (const event of plugin.manifest.events) {
          lines.push(`- \`${event.event}\`${event.once ? ' *(once)*' : ''}`)
        }
        lines.push('')
      }

      if (plugin.manifest?.crons.length) {
        lines.push(`**Crons** (${plugin.manifest.crons.length})`, '')
        for (const cron of plugin.manifest.crons) {
          lines.push(`- \`${cron.name}\` — \`${cron.cron}\`${cron.once ? ' *(once)*' : ''}`)
        }
        lines.push('')
      }

      if (plugin.manifest?.entities.length) {
        lines.push(`**Entidades DB**: ${plugin.manifest.entities.join(', ')}`, '')
      }

      lines.push(`**Tamanho**: ${plugin.sizeLabel} | **SHA-256**: \`${plugin.sha256.slice(0, 16)}...\``, '')
    }
  }

  if (releaseIndex.binaries.length > 0) {
    lines.push('## Binarios', '')
    for (const binary of releaseIndex.binaries) {
      lines.push(`### ${binary.name}`, '')
      lines.push(`**Tamanho**: ${binary.sizeLabel} | **SHA-256**: \`${binary.sha256.slice(0, 16)}...\``, '')
    }
  }

  return lines.join('\n')
}
