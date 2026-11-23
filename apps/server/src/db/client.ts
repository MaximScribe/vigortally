import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';
import * as schema from './schema';

export type Schema = typeof schema;
export type Database = PgDatabase<PgQueryResultHKT, Schema>;

export interface DatabaseHandle {
  db: Database;
  /** `postgres` for an external server, `embedded` for PGlite. */
  kind: 'postgres' | 'embedded';
  migrate(): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export type DatabaseTarget =
  | { kind: 'postgres'; url: string }
  /** `dataDir` null keeps the embedded database in memory (tests). */
  | { kind: 'embedded'; dataDir: string | null };

export interface OpenOptions {
  migrationsFolder: string;
}

const casing = 'snake_case' as const;

export async function openDatabase(
  target: DatabaseTarget,
  { migrationsFolder }: OpenOptions,
): Promise<DatabaseHandle> {
  if (target.kind === 'postgres') {
    const client = postgres(target.url, { max: 10, onnotice: () => {} });
    const db = drizzlePostgres({ client, schema, casing });
    return {
      db: db as unknown as Database,
      kind: 'postgres',
      migrate: () => migratePostgres(db, { migrationsFolder }),
      ping: () => ping(db as unknown as Database),
      close: () => client.end({ timeout: 5 }),
    };
  }

  let client: PGlite;
  if (target.dataDir) {
    await mkdir(target.dataDir, { recursive: true });
    client = new PGlite(join(target.dataDir, 'pglite'));
  } else {
    client = new PGlite();
  }
  const db = drizzlePglite({ client, schema, casing });
  return {
    db: db as unknown as Database,
    kind: 'embedded',
    migrate: () => migratePglite(db, { migrationsFolder }),
    ping: () => ping(db as unknown as Database),
    close: () => client.close(),
  };
}

async function ping(db: Database): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
