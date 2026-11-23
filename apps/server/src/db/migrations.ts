import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Finds the `drizzle/` migrations folder. In development it sits next to `src/`; in the
 * production bundle (`dist/main.js`) it is copied next to `dist/`. MIGRATIONS_DIR overrides.
 */
export function findMigrationsFolder(override = process.env.MIGRATIONS_DIR): string {
  if (override) return resolve(override);
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, 'drizzle');
    if (existsSync(join(candidate, 'meta', '_journal.json'))) return candidate;
    dir = dirname(dir);
  }
  throw new Error('Could not find the drizzle/ migrations folder; set MIGRATIONS_DIR');
}
