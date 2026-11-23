import { createHash, randomBytes } from 'node:crypto';

/** Random bearer token, 256 bits, URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored hashed, so a leaked database can't be used to log in. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
