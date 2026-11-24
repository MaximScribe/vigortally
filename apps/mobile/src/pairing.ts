/** What the pairing QR code contains: `vigortally://pair?server=…&code=…`. */
export interface PairingLink {
  serverUrl: string;
  code: string;
}

export function parsePairingLink(value: string): PairingLink | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'vigortally:') return null;
  const server = url.searchParams.get('server');
  const code = url.searchParams.get('code');
  if (!server || !code) return null;
  const serverUrl = normalizeServerUrl(server);
  return serverUrl ? { serverUrl, code } : null;
}

/** Accepts "vt.example.ts.net", "http://192.168.1.10:8080/", … and returns a clean base URL. */
export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

/** Plain HTTP is only sensible on a home network; everything else should use HTTPS. */
export function isInsecureRemote(serverUrl: string): boolean {
  const url = new URL(serverUrl);
  if (url.protocol === 'https:') return false;
  return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.)/.test(url.hostname);
}
