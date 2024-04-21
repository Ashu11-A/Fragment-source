import { core } from '@/app'
import { getSettings } from '@/functions/getSettings'
import { App } from './app'
import http from 'http'
import dotenv from 'dotenv'
dotenv.config()

export default function Run (): void {
  const app = new App().server
  const server = http.createServer(app)

  server.listen(getSettings().Express.Port, getSettings().Express.ip, () => {
    core.info(`✅ Servidor listado em http://localhost:${getSettings().Express.Port}`.green)
  })
}
