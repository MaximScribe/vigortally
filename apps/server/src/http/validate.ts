import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';

function badRequest(issues: z.core.$ZodIssue[]): never {
  const body = {
    error: 'invalid_request',
    issues: issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  };
  throw new HTTPException(400, {
    res: new Response(JSON.stringify(body), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    }),
  });
}

/** Parses the JSON body with `schema`; responds 400 with the issues if it doesn't match. */
export async function readBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    badRequest([{ code: 'custom', path: [], message: 'Body must be JSON', input: undefined }]);
  }
  const result = schema.safeParse(raw);
  if (!result.success) badRequest(result.error.issues);
  return result.data;
}

/** Parses query parameters with `schema`. */
export function readQuery<S extends z.ZodType>(c: Context, schema: S): z.output<S> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) badRequest(result.error.issues);
  return result.data;
}
