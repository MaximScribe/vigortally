import type { ApiError } from '@vigortally/schema';

export interface HttpOptions {
  /** Server address, e.g. `https://vigortally.example.ts.net`. Empty for same-origin (web). */
  baseUrl: string;
  /** Bearer token for paired devices. The web app relies on the session cookie instead. */
  getToken?: () => string | null | undefined;
  fetch?: typeof fetch;
  /** Called on 401, e.g. to show the login screen or unpair. */
  onUnauthorized?: () => void;
}

/** A failed API call, carrying the server's error code and validation issues. */
export class ApiRequestError extends Error {
  override name = 'ApiRequestError';

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: ApiError['issues'] = undefined,
  ) {
    super(message);
  }

  /** True when the server couldn't be reached at all (offline, DNS, TLS). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Requester = <T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | undefined | null>,
) => Promise<T>;

export function createRequester(options: HttpOptions): Requester {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  return async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined | null>,
  ): Promise<T> {
    const doFetch = options.fetch ?? globalThis.fetch;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value != null && value !== '') params.set(key, String(value));
    }
    const url = `${baseUrl}/api${path}${params.size ? `?${params}` : ''}`;

    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const token = options.getToken?.();
    if (token) headers.authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await doFetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
      });
    } catch (error) {
      throw new ApiRequestError(0, 'network_error', `Can't reach the server (${String(error)})`);
    }

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      if (res.status === 401) options.onUnauthorized?.();
      const error = (data ?? {}) as Partial<ApiError>;
      throw new ApiRequestError(
        res.status,
        error.error ?? 'http_error',
        error.message ?? error.issues?.[0]?.message ?? `Request failed (${res.status})`,
        error.issues,
      );
    }
    return data as T;
  };
}
