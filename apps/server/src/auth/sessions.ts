import { randomUUID } from 'node:crypto';
import { profile as profileSchema, type Profile, type User } from '@vigortally/schema';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import type { Database } from '../db/client';
import { sessions, users } from '../db/schema';
import { generateToken, hashToken } from '../lib/tokens';

export const SESSION_COOKIE = 'vt_session';
export const WEB_SESSION_DAYS = 30;
/** lastUsedAt is refreshed at most this often, to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 5 * 60_000;

export interface AuthUser extends User {
  profile: Profile;
}

export interface AuthSession {
  id: string;
  kind: 'web' | 'device';
}

export function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    householdId: row.householdId,
    profile: profileSchema.parse(row.profile ?? {}),
  };
}

/** Public user shape (no profile). */
export function publicUser({ id, name, email, role, householdId }: AuthUser | User): User {
  return { id, name, email, role, householdId };
}

export async function createSession(
  db: Database,
  userId: string,
  kind: 'web' | 'device',
  name: string,
  now: Date,
): Promise<{ token: string; id: string; expiresAt: Date | null }> {
  const token = generateToken();
  const id = randomUUID();
  const expiresAt = kind === 'web' ? new Date(now.getTime() + WEB_SESSION_DAYS * 86_400_000) : null;
  await db.insert(sessions).values({
    id,
    userId,
    tokenHash: hashToken(token),
    kind,
    name: name.slice(0, 120),
    lastUsedAt: now,
    expiresAt,
  });
  return { token, id, expiresAt };
}

/** Resolves a token to its user, refreshing the session's last use. Null if invalid. */
export async function resolveSession(
  db: Database,
  token: string,
  now: Date,
): Promise<{ user: AuthUser; session: AuthSession } | null> {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        or(isNull(sessions.expiresAt), gt(sessions.expiresAt, now)),
      ),
    )
    .limit(1);
  if (!row) return null;

  const last = row.session.lastUsedAt?.getTime() ?? 0;
  if (now.getTime() - last > TOUCH_INTERVAL_MS) {
    const patch: Partial<typeof sessions.$inferInsert> = { lastUsedAt: now };
    // Sliding expiry for web sessions.
    if (row.session.kind === 'web') {
      patch.expiresAt = new Date(now.getTime() + WEB_SESSION_DAYS * 86_400_000);
    }
    await db.update(sessions).set(patch).where(eq(sessions.id, row.session.id));
  }

  return {
    user: toAuthUser(row.user),
    session: { id: row.session.id, kind: row.session.kind },
  };
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
