import { expect, test } from 'vitest';
import { isInsecureRemote, normalizeServerUrl, parsePairingLink } from './pairing';

test('reads the pairing QR code', () => {
  expect(
    parsePairingLink('vigortally://pair?server=https%3A%2F%2Fvt.example.ts.net&code=ABCD-EFGH'),
  ).toEqual({ serverUrl: 'https://vt.example.ts.net', code: 'ABCD-EFGH' });
  expect(parsePairingLink('https://example.com')).toBeNull();
  expect(parsePairingLink('vigortally://pair?code=X')).toBeNull();
  expect(parsePairingLink('not a url')).toBeNull();
});

test('normalises typed server addresses', () => {
  expect(normalizeServerUrl('vt.example.ts.net')).toBe('https://vt.example.ts.net');
  expect(normalizeServerUrl('http://192.168.1.10:8080/')).toBe('http://192.168.1.10:8080');
  expect(normalizeServerUrl('  ')).toBeNull();
});

test('flags plain HTTP outside the home network', () => {
  expect(isInsecureRemote('http://192.168.1.10:8080')).toBe(false);
  expect(isInsecureRemote('http://100.101.1.2:8080')).toBe(false); // Tailscale
  expect(isInsecureRemote('https://vt.example.com')).toBe(false);
  expect(isInsecureRemote('http://vt.example.com')).toBe(true);
});
