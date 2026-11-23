import type { Profile, User } from '@vigortally/schema';

export interface FakeRequest {
  body: unknown;
  query: URLSearchParams;
  params: Record<string, string>;
}

type Handler = (req: FakeRequest) => unknown;

/** Throw from a handler to answer with an error status. */
export class FakeResponse {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {}
}

export const testUser: User = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Thomas Tester',
  email: 'thomas@example.com',
  role: 'admin',
  householdId: '00000000-0000-4000-8000-0000000000aa',
};

export const testProfile: Profile = {
  units: 'metric',
  shoppingDay: 6,
  targets: { kcal: 2200, protein: 140, carbs: 250, fat: 70, waterMl: 2500 },
};

/**
 * In-memory stand-in for the VigorTally API, answering the web app's fetch calls.
 * Defaults: set up and signed in as `testUser`.
 */
export class FakeServer {
  private routes: { method: string; pattern: RegExp; keys: string[]; handler: Handler }[] = [];
  readonly calls: { method: string; path: string; body: unknown }[] = [];

  constructor() {
    this.on('GET', '/setup', () => ({ setupRequired: false }));
    this.on('GET', '/me', () => ({ user: testUser, profile: testProfile }));
  }

  /** Registers a handler; later registrations win. `path` may contain `:params`. */
  on(method: string, path: string, handler: Handler): this {
    const keys: string[] = [];
    const pattern = new RegExp(
      `^${path.replace(/:(\w+)/g, (_, key: string) => {
        keys.push(key);
        return '([^/]+)';
      })}$`,
    );
    this.routes.unshift({ method, pattern, keys, handler });
    return this;
  }

  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace(/^\/api/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    this.calls.push({ method, path, body });

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = route.pattern.exec(path);
      if (!match) continue;
      const params = Object.fromEntries(route.keys.map((key, i) => [key, match[i + 1] ?? '']));
      try {
        const result = await route.handler({ body, query: url.searchParams, params });
        return result === undefined
          ? new Response(null, { status: 204 })
          : new Response(JSON.stringify(result), { status: 200 });
      } catch (error) {
        if (error instanceof FakeResponse) {
          return new Response(JSON.stringify(error.body), { status: error.status });
        }
        throw error;
      }
    }
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  };
}
