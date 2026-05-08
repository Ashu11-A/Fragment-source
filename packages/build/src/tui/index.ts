import { createCliRenderer } from '@opentui/core'
import { DevApp } from './app'

const renderer = await createCliRenderer({
  screenMode: 'alternate-screen',
  exitOnCtrlC: false,
  clearOnShutdown: true,
  autoFocus: false,
})

new DevApp(renderer).start()
