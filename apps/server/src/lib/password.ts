import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

/** scrypt from Node's crypto module: no native dependencies, works on every architecture. */
function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

const KEY_LENGTH = 64;
/**
 * N = 2^15 costs ~32 MB and a noticeable moment per hash: right for real logins, too
 * heavy when hundreds of tests hash in parallel. Tests (NODE_ENV=test, set by Vitest)
 * use a cheap cost; the stored format records N, so verification works either way.
 */
const DEFAULT_COST =
  process.env.NODE_ENV === 'test' ? { N: 2 ** 10, r: 8, p: 1 } : { N: 2 ** 15, r: 8, p: 1 };

/** Stored format: `scrypt$N$r$p$<salt base64>$<hash base64>`. */
export async function hashPassword(password: string, cost = DEFAULT_COST): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, {
    ...cost,
    maxmem: 128 * cost.N * cost.r * 2,
  });
  return ['scrypt', cost.N, cost.r, cost.p, salt.toString('base64'), key.toString('base64')].join(
    '$',
  );
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const cost = { N: Number(n), r: Number(r), p: Number(p) };
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    ...cost,
    maxmem: 128 * cost.N * cost.r * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash used when an email doesn't exist, so failed logins take the same time either way. */
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword('not-a-real-password');
  return dummyHash;
}
