import { openDatabase, type DatabaseHandle } from '../db/client';
import { findMigrationsFolder } from '../db/migrations';

/** Fresh in-memory database with all migrations applied. */
export async function createTestDatabase(): Promise<DatabaseHandle> {
  const handle = await openDatabase(
    { kind: 'embedded', dataDir: null },
    { migrationsFolder: findMigrationsFolder() },
  );
  await handle.migrate();
  return handle;
}
