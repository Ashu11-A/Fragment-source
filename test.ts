import { watch } from 'fs/promises'

(async () => {
  try {
    const watcher = watch('test') // pode ser um arquivo ou diretorio
    for await (const event of watcher) {
        console.log(event)
    }
  } catch (err: any) {
    throw err
  }
})();