import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";

let code = await readFile('Claim.entry.js', { encoding: 'utf-8' })
const regex = /require\("(?!\.\/)([^"]+)"\)/g

let match;
while ((match = regex.exec(code)) !== null) {
  const content = match[1];
  console.log(content)
  if (content) {
    const __dirname = fileURLToPath(import.meta.url)
    const replacedPath = `"${join(__dirname, '../../')}node_modules/${content}"`;
    const genRegex = new RegExp(`"${content}"`, 'g')
    code = code.replace(genRegex, replacedPath);
  }
}