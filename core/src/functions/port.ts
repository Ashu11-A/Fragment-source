import { randomInt } from 'crypto'
import { createServer } from 'http'

export async function generatePort () {
  const port = randomInt(65535)
  const result = await new Promise<boolean>((resolve) => {
    const server = createServer()

    server.once('error', (err) => {
      console.log(err)
      resolve(false)
    })

    server.once('listening', () => {
      server.close()
      resolve(true)
    })

    server.listen(port, 'localhost')
  })

  if (!result) return await generatePort()
  return port
}
