import type { App } from '../app';

export interface TestResponse<T = unknown> {
  status: number;
  body: T;
  headers: Headers;
}

/**
 * Tiny JSON client for route tests. Remembers the session cookie like a browser, or sends
 * a Bearer token like the companion app.
 */
export class TestClient {
  cookie: string | undefined;

  constructor(
    private readonly app: App,
    public token?: string,
  ) {}

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<TestResponse<T>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookie) headers.cookie = this.cookie;
    if (this.token) headers.authorization = `Bearer ${this.token}`;

    const res = await this.app.request(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const pair = setCookie.split(';')[0] ?? '';
      this.cookie = pair.endsWith('=') ? undefined : pair;
    }
    const text = await res.text();
    return {
      status: res.status,
      body: (text ? JSON.parse(text) : null) as T,
      headers: res.headers,
    };
  }

  get = <T = unknown>(path: string) => this.request<T>('GET', path);
  post = <T = unknown>(path: string, body?: unknown) => this.request<T>('POST', path, body ?? {});
  put = <T = unknown>(path: string, body: unknown) => this.request<T>('PUT', path, body);
  patch = <T = unknown>(path: string, body: unknown) => this.request<T>('PATCH', path, body);
  delete = <T = unknown>(path: string) => this.request<T>('DELETE', path);
}

export const ADMIN = { name: 'Admin', email: 'admin@example.com', password: 'correct horse' };

/** Runs first-time setup and returns a client signed in as the admin. */
export async function setUpAdmin(app: App): Promise<TestClient> {
  const client = new TestClient(app);
  const res = await client.post('/api/setup', ADMIN);
  if (res.status !== 201)
    throw new Error(`setup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return client;
}
