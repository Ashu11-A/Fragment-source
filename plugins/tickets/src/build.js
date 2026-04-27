import { build } from 'build';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
await build(dirname(fileURLToPath(import.meta.url)));
