import type { DaemonEventHandler } from '../../socket/protocol.js'

// Evento emitido pelo daemon ao concluir sua inicialização
export const onDaemonReady: DaemonEventHandler = async (payload, daemonId) => {
  const daemonVersion = payload['daemonVersion']
  const platform = payload['platform']

  console.log(
    `[system] Daemon ${daemonId} pronto — versão ${daemonVersion} em ${platform}`,
  )
}
