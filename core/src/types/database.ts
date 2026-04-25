/**
 * Global type registry — activates DatabaseRegistry augmentations from all plugins.
 *
 * Each import below is type-only (erased at runtime) and exists solely to make
 * TypeScript aware of the `declare module 'database' { interface DatabaseRegistry { ... } }`
 * declarations inside each plugin's entity/index.ts file.
 *
 * HOW TO ADD A NEW PLUGIN:
 *   1. Create  plugins/<name>/src/entity/index.ts  with a `database` const and
 *      its `declare module 'database' { interface DatabaseRegistry { ... } }` block.
 *   2. Add one line here:  import type {} from '../../../plugins/<name>/src/utils/database.js'
 *   3. Call  ctx.registerSchema(schema)  inside the plugin's setup().
 *
 * The build script can auto-generate this file by scanning plugins/ for database.ts files.
 */

import type {} from '../../../plugins/tickets/src/database/index.js'
import type {} from '../../../plugins/base/src/database/index.js'
