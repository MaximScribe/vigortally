import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../context';
import { fail } from '../http/errors';
import { resolveSession, SESSION_COOKIE } from './sessions';

/** Token from `Authorization: Bearer …` (companion app) or the session cookie (web). */
function readToken(c: Context): string | undefined {
  const header = c.req.header('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim() || undefined;
  return getCookie(c, SESSION_COOKIE);
}

/** Rejects the request with 401 unless it carries a valid session. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = readToken(c);
  const resolved = token ? await resolveSession(c.var.db, token, c.var.deps.now()) : null;
  if (!resolved) fail(401, 'unauthorized', 'Sign in to continue');
  c.set('user', resolved.user);
  c.set('session', resolved.session);
  await next();
});

/** Must run after `requireAuth`. */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.var.user.role !== 'admin') fail(403, 'forbidden', 'Only admins can do this');
  await next();
});
