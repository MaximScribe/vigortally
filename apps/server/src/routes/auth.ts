import { randomUUID } from 'node:crypto';
import {
  changePasswordInput,
  createUserInput,
  loginInput,
  profile as profileSchema,
  profileInput,
  setupInput,
} from '@vigortally/schema';
import { and, count, eq, ne, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { requireAdmin } from '../auth/middleware';
import {
  createSession,
  deleteSession,
  publicUser,
  SESSION_COOKIE,
  toAuthUser,
  WEB_SESSION_DAYS,
} from '../auth/sessions';
import type { AppEnv } from '../context';
import { households, sessions, users } from '../db/schema';
import { fail, notFound } from '../http/errors';
import { readBody } from '../http/validate';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../lib/password';
import { AttemptLimiter } from '../lib/rateLimit';

/** Cookies are `Secure` whenever the browser reached us over HTTPS (directly or via proxy). */
function isHttps(c: Context): boolean {
  return c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
}

function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isHttps(c),
    path: '/',
    maxAge: WEB_SESSION_DAYS * 86_400,
  });
}

function clientKey(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? '';
}

function userAgentName(c: Context): string {
  const ua = c.req.header('user-agent') ?? '';
  const browser =
    /(Firefox|Edg|Chrome|Safari)\//.exec(ua)?.[1]?.replace('Edg', 'Edge') ?? 'Browser';
  const os = /(Windows|Android|iPhone|iPad|Mac OS X|Linux)/.exec(ua)?.[1] ?? '';
  return os ? `${browser} on ${os.replace('Mac OS X', 'macOS')}` : browser;
}

export function authRoutes() {
  const app = new Hono<AppEnv>();
  const loginLimiter = new AttemptLimiter(10, 15 * 60_000);

  async function userCount(c: Context<AppEnv>) {
    const [row] = await c.var.db.select({ n: count() }).from(users);
    return row?.n ?? 0;
  }

  // ---- first run ----------------------------------------------------------

  app.get('/setup', async (c) => c.json({ setupRequired: (await userCount(c)) === 0 }));

  app.post('/setup', async (c) => {
    const input = await readBody(c, setupInput);
    if ((await userCount(c)) > 0) fail(409, 'already_set_up', 'This server already has an admin');

    const householdId = randomUUID();
    const userId = randomUUID();
    const passwordHash = await hashPassword(input.password);
    await c.var.db.transaction(async (tx) => {
      await tx.insert(households).values({ id: householdId, name: input.householdName });
      await tx.insert(users).values({
        id: userId,
        householdId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: 'admin',
      });
    });

    const [row] = await c.var.db.select().from(users).where(eq(users.id, userId));
    const session = await createSession(
      c.var.db,
      userId,
      'web',
      userAgentName(c),
      c.var.deps.now(),
    );
    setSessionCookie(c, session.token);
    return c.json(publicUser(toAuthUser(row!)), 201);
  });

  // ---- sessions -------------------------------------------------------------

  app.post('/auth/login', async (c) => {
    const input = await readBody(c, loginInput);
    const key = `${clientKey(c)}|${input.email}`;
    if (!loginLimiter.allowed(key)) {
      fail(429, 'too_many_attempts', 'Too many failed attempts. Try again in a few minutes.');
    }

    const [row] = await c.var.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${input.email}`)
      .limit(1);
    const valid = await verifyPassword(
      input.password,
      row?.passwordHash ?? (await dummyPasswordHash()),
    );
    if (!row || !valid) {
      loginLimiter.fail(key);
      fail(401, 'invalid_credentials', 'Email or password is wrong');
    }
    loginLimiter.reset(key);

    const session = await createSession(
      c.var.db,
      row.id,
      'web',
      userAgentName(c),
      c.var.deps.now(),
    );
    setSessionCookie(c, session.token);
    return c.json(publicUser(toAuthUser(row)));
  });

  app.post('/auth/logout', async (c) => {
    await deleteSession(c.var.db, c.var.session.id);
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.body(null, 204);
  });

  // ---- current user ---------------------------------------------------------

  app.get('/me', (c) => c.json({ user: publicUser(c.var.user), profile: c.var.user.profile }));

  app.patch('/me/profile', async (c) => {
    const patch = await readBody(c, profileInput);
    const current = c.var.user.profile;
    const next = profileSchema.parse({
      ...current,
      ...patch,
      targets: { ...current.targets, ...patch.targets },
    });
    await c.var.db.update(users).set({ profile: next }).where(eq(users.id, c.var.user.id));
    return c.json(next);
  });

  app.post('/me/password', async (c) => {
    const input = await readBody(c, changePasswordInput);
    const [row] = await c.var.db.select().from(users).where(eq(users.id, c.var.user.id));
    if (!row || !(await verifyPassword(input.currentPassword, row.passwordHash))) {
      fail(400, 'wrong_password', 'Current password is wrong');
    }
    await c.var.db
      .update(users)
      .set({ passwordHash: await hashPassword(input.newPassword) })
      .where(eq(users.id, row.id));
    // Sign out everywhere else.
    await c.var.db
      .delete(sessions)
      .where(and(eq(sessions.userId, row.id), ne(sessions.id, c.var.session.id)));
    return c.body(null, 204);
  });

  // ---- household members ----------------------------------------------------

  app.get('/users', async (c) => {
    const rows = await c.var.db
      .select()
      .from(users)
      .where(eq(users.householdId, c.var.user.householdId))
      .orderBy(users.createdAt);
    return c.json(rows.map((row) => publicUser(toAuthUser(row))));
  });

  app.post('/users', requireAdmin, async (c) => {
    const input = await readBody(c, createUserInput);
    const [existing] = await c.var.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${input.email}`);
    if (existing) fail(409, 'email_taken', 'An account with this email already exists');

    const id = randomUUID();
    await c.var.db.insert(users).values({
      id,
      householdId: c.var.user.householdId,
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
    });
    const [row] = await c.var.db.select().from(users).where(eq(users.id, id));
    return c.json(publicUser(toAuthUser(row!)), 201);
  });

  app.delete('/users/:id', requireAdmin, async (c) => {
    const id = c.req.param('id');
    if (id === c.var.user.id) fail(400, 'cannot_delete_self', "You can't delete your own account");
    const deleted = await c.var.db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.householdId, c.var.user.householdId)))
      .returning({ id: users.id });
    if (deleted.length === 0) notFound('User not found');
    return c.body(null, 204);
  });

  return app;
}
