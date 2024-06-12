import { concurrently, ConcurrentlyCommandInput } from "concurrently";
import { join } from "path";
import { cwd } from "process";
import { check } from "./autoUpdate.js";

await check()

const commands: ConcurrentlyCommandInput[] = [
  { command: 'npm run install' },
  { command: 'npm run watch' },
  { command: 'npm run dev', cwd: join(cwd(), 'core') }
]

concurrently(commands, { raw: true, maxProcesses: 2 })