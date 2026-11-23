import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createTestDatabase } from '../test/db';
import type { DatabaseHandle } from './client';
import { households, users } from './schema';

let handle: DatabaseHandle;
beforeAll(async () => {
  handle = await createTestDatabase();
});
afterAll(() => handle.close());

test('migrations create a working schema', async () => {
  const householdId = randomUUID();
  await handle.db.insert(households).values({ id: householdId, name: 'Home' });
  await handle.db.insert(users).values({
    id: randomUUID(),
    householdId,
    name: 'Tester',
    email: 'Tester@Example.com',
    passwordHash: 'x',
  });

  const [row] = await handle.db.select().from(users).where(eq(users.householdId, householdId));
  expect(row).toMatchObject({ name: 'Tester', role: 'member', profile: {} });
});

test('emails are unique regardless of case', async () => {
  const [household] = await handle.db.select().from(households).limit(1);
  await expect(
    handle.db.insert(users).values({
      id: randomUUID(),
      householdId: household!.id,
      name: 'Dup',
      email: 'tester@example.com',
      passwordHash: 'x',
    }),
  ).rejects.toThrow();
});

test('ping reports a healthy database', async () => {
  expect(await handle.ping()).toBe(true);
  expect(handle.kind).toBe('embedded');
});
