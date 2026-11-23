import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Throws a JSON error response: `{ error: code, message }`. */
export function fail(status: ContentfulStatusCode, code: string, message?: string): never {
  throw new HTTPException(status, {
    res: new Response(JSON.stringify({ error: code, ...(message ? { message } : {}) }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  });
}

export function notFound(what = 'Not found'): never {
  fail(404, 'not_found', what);
}
