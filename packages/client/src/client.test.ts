import { describe, expect, test, vi } from 'vitest';
import { ApiRequestError, createApiClient } from './index';

function fakeFetch(status: number, body: unknown) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
}

describe('api client', () => {
  test('builds URLs, sends JSON and the bearer token', async () => {
    const fetch = fakeFetch(200, { name: 'VigorTally' });
    const api = createApiClient({
      baseUrl: 'https://vt.example.ts.net/',
      getToken: () => 'secret',
      fetch,
    });

    await api.auth.login({ email: 'a@b.de', password: 'pw' });

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://vt.example.ts.net/api/auth/login');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ email: 'a@b.de', password: 'pw' }));
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer secret');
  });

  test('adds query parameters, skipping empty ones', async () => {
    const fetch = fakeFetch(200, []);
    const api = createApiClient({ baseUrl: '', fetch });
    await api.request('GET', '/foods', undefined, { q: 'oat', barcode: undefined, limit: 5 });
    expect(fetch.mock.calls[0]![0]).toBe('/api/foods?q=oat&limit=5');
  });

  test('turns error responses into ApiRequestError', async () => {
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: '',
      fetch: fakeFetch(401, { error: 'unauthorized', message: 'Sign in to continue' }),
      onUnauthorized,
    });
    const error = await api.me.get().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      status: 401,
      code: 'unauthorized',
      message: 'Sign in to continue',
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  test('uses the first validation issue as message', async () => {
    const api = createApiClient({
      baseUrl: '',
      fetch: fakeFetch(400, {
        error: 'invalid_request',
        issues: [{ path: 'password', message: 'Use at least 8 characters' }],
      }),
    });
    await expect(api.auth.setup({ name: 'a', email: 'a@b.de', password: 'x' })).rejects.toThrow(
      'Use at least 8 characters',
    );
  });

  test('reports network failures with status 0', async () => {
    const api = createApiClient({
      baseUrl: 'http://offline',
      fetch: vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    });
    const error = (await api.server.info().catch((e: unknown) => e)) as ApiRequestError;
    expect(error.isNetworkError).toBe(true);
  });
});
