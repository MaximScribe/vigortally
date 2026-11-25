import { expect, test } from 'vitest';
import { hashPassword, verifyPassword } from './password';

test('hashes are salted and verify only the right password', async () => {
  const a = await hashPassword('correct horse');
  const b = await hashPassword('correct horse');
  expect(a).not.toBe(b);
  expect(a).toMatch(/^scrypt\$\d+\$8\$1\$/);
  expect(await verifyPassword('correct horse', a)).toBe(true);
  expect(await verifyPassword('wrong horse', a)).toBe(false);
  expect(await verifyPassword('x', 'garbage')).toBe(false);
});

test('hashes made with production cost still verify', async () => {
  const strong = await hashPassword('correct horse', { N: 2 ** 15, r: 8, p: 1 });
  expect(strong).toMatch(/^scrypt\$32768\$/);
  expect(await verifyPassword('correct horse', strong)).toBe(true);
});
