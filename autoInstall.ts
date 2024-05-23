import { concurrently, ConcurrentlyCommandInput } from "concurrently";
import { glob } from "glob";
import gradient from "gradient-string";
import { join } from "path";
import { cwd } from "process";
import figlet from 'figlet'

console.log(gradient('#8752a3', '#6274e7')(figlet.textSync('Mult Install', { font: 'Elite' })))
console.log()

const ready = (name: string, seconds: number) => {
  let timeColor = gradient('#30c67c', '#82f4b1')

  if (seconds > 5 && seconds <= 14) {
    timeColor = gradient('#ff930f', '#fff95b')
  } else if (seconds > 15) {
    timeColor = gradient('#f89b29', '#e60b09')
  }
  console.log(`[${name}] ${timeColor(seconds.toFixed(2) + 's')}`)
}

const getPaths = await glob(["plugins/*"], { cwd: cwd() }); getPaths.push('core')
const commands: ConcurrentlyCommandInput[] = []


for (const path of getPaths) {
  commands.push({ command: 'npm i', cwd: join(cwd(), path) })
}

const { result } = concurrently(commands)

result.then((res) => {
  for (const command of res) {
    const parts = command.command.cwd?.split('/')
    const dirname = parts?.pop()
    ready((dirname ?? 'Indefinido'), command.timings.durationSeconds)
  }
})