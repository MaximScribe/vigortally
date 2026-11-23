import { randomInt } from 'node:crypto';
import {
  id as idSchema,
  pairInput,
  type Device,
  type PairingCode,
  type PairResult,
} from '@vigortally/schema';
import { and, desc, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { createSession, publicUser, toAuthUser } from '../auth/sessions';
import type { AppEnv } from '../context';
import { pairingCodes, sessions, users } from '../db/schema';
import { fail, notFound } from '../http/errors';
import { readBody } from '../http/validate';
import { AttemptLimiter } from '../lib/rateLimit';
import { hashToken } from '../lib/tokens';

export const PAIRING_TTL_MS = 10 * 60_000;
/** No 0/O, 1/I/L: easy to read aloud and type. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generatePairingCode(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/** Codes are compared without the dash and case-insensitively. */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** The address devices should use: PUBLIC_URL, or what the browser used to reach us. */
function serverUrl(c: Context<AppEnv>): string {
  const configured = c.var.deps.config.publicUrl;
  if (configured) return configured;
  const url = new URL(c.req.url);
  const proto = c.req.header('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? url.host;
  return `${proto}://${host}`;
}

export function deviceRoutes() {
  const app = new Hono<AppEnv>();
  const limiter = new AttemptLimiter(20, 15 * 60_000);

  app.post('/devices/pairing', async (c) => {
    const now = c.var.deps.now();
    const code = generatePairingCode();
    const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS);
    // Old unused codes of this user stop working when a new one is made.
    await c.var.db
      .delete(pairingCodes)
      .where(
        or(
          and(eq(pairingCodes.userId, c.var.user.id), isNull(pairingCodes.usedAt)),
          lt(pairingCodes.expiresAt, now),
        ),
      );
    await c.var.db.insert(pairingCodes).values({
      codeHash: hashToken(normalizeCode(code)),
      userId: c.var.user.id,
      expiresAt,
    });
    const server = serverUrl(c);
    const link = `vigortally://pair?server=${encodeURIComponent(server)}&code=${encodeURIComponent(code)}`;
    return c.json<PairingCode>(
      { code, expiresAt: expiresAt.toISOString(), link, serverUrl: server },
      201,
    );
  });

  /** Public: the companion app trades a code for its own device token. */
  app.post('/devices/pair', async (c) => {
    const input = await readBody(c, pairInput);
    const key = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'direct';
    if (!limiter.allowed(key))
      fail(429, 'too_many_attempts', 'Too many attempts. Wait a few minutes.');

    const now = c.var.deps.now();
    const codeHash = hashToken(normalizeCode(input.code));
    // Claim the code atomically so it can only be used once.
    const [claimed] = await c.var.db
      .update(pairingCodes)
      .set({ usedAt: now })
      .where(
        and(
          eq(pairingCodes.codeHash, codeHash),
          isNull(pairingCodes.usedAt),
          gt(pairingCodes.expiresAt, now),
        ),
      )
      .returning();
    if (!claimed) {
      limiter.fail(key);
      fail(400, 'invalid_code', 'This code is wrong or has expired. Create a new one.');
    }

    const [row] = await c.var.db.select().from(users).where(eq(users.id, claimed.userId));
    if (!row) fail(400, 'invalid_code');
    const session = await createSession(c.var.db, row.id, 'device', input.deviceName, now);
    return c.json<PairResult>({ token: session.token, user: publicUser(toAuthUser(row)) });
  });

  app.get('/devices', async (c) => {
    const rows = await c.var.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, c.var.user.id))
      .orderBy(desc(sessions.lastUsedAt));
    const result: Device[] = rows.map((s) => ({
      id: s.id,
      name: s.name || (s.kind === 'device' ? 'Companion app' : 'Browser'),
      kind: s.kind,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt?.toISOString() ?? null,
      current: s.id === c.var.session.id,
    }));
    return c.json(result);
  });

  app.delete('/devices/:id', async (c) => {
    const id = idSchema.safeParse(c.req.param('id'));
    if (!id.success) notFound('Device not found');
    const deleted = await c.var.db
      .delete(sessions)
      .where(and(eq(sessions.id, id.data), eq(sessions.userId, c.var.user.id)))
      .returning({ id: sessions.id });
    if (deleted.length === 0) notFound('Device not found');
    return c.body(null, 204);
  });

  return app;
}
