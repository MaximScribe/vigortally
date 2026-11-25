import { describe, expect, test, vi } from 'vitest';
import { ApiRequestError } from './http';
import { Outbox, type OutboxStorage, type WriteSender } from './outbox';

function memoryStorage(): OutboxStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
  };
}

const offline = () => new ApiRequestError(0, 'network_error', 'offline');

describe('Outbox', () => {
  test('keeps writes while offline and sends them in order later', async () => {
    const storage = memoryStorage();
    const outbox = new Outbox(storage);
    await outbox.enqueue({ method: 'PUT', path: '/workouts/1', body: { id: 1 } });
    await outbox.enqueue({ method: 'PUT', path: '/diary/2', body: { id: 2 } });

    const failing = vi.fn<WriteSender>(async () => {
      throw offline();
    });
    expect(await outbox.flush(failing)).toEqual({ sent: 0, rejected: [], pending: 2 });
    expect(failing).toHaveBeenCalledTimes(1);

    // Survives an app restart.
    const restarted = new Outbox(storage);
    const sent: string[] = [];
    const ok = vi.fn<WriteSender>(async (_method, path) => {
      sent.push(path);
      return null;
    });
    expect(await restarted.flush(ok)).toEqual({ sent: 2, rejected: [], pending: 0 });
    expect(sent).toEqual(['/workouts/1', '/diary/2']);
  });

  test('drops writes the server rejects and keeps going', async () => {
    const outbox = new Outbox(memoryStorage());
    await outbox.enqueue({ method: 'PUT', path: '/diary/bad', body: {} });
    await outbox.enqueue({ method: 'PUT', path: '/diary/good', body: {} });
    const request = vi.fn<WriteSender>(async (_m, path) => {
      if (path === '/diary/bad') throw new ApiRequestError(400, 'invalid_request', 'nope');
      return null;
    });
    const result = await outbox.flush(request);
    expect(result.sent).toBe(1);
    expect(result.rejected.map((r) => r.write.path)).toEqual(['/diary/bad']);
    expect(outbox.pending).toBe(0);
  });

  test('server errors and expired sessions are retried later', async () => {
    const outbox = new Outbox(memoryStorage());
    await outbox.enqueue({ method: 'DELETE', path: '/diary/1' });
    for (const status of [500, 401, 429]) {
      const result = await outbox.flush(async () => {
        throw new ApiRequestError(status, 'x', 'x');
      });
      expect(result.pending, String(status)).toBe(1);
    }
  });

  test('notifies listeners and shares one flush between callers', async () => {
    const outbox = new Outbox(memoryStorage());
    const counts: number[] = [];
    outbox.subscribe((n) => counts.push(n));
    await outbox.enqueue({ method: 'PUT', path: '/a', body: {} });
    let resolve!: () => void;
    const request = vi.fn<WriteSender>(() => new Promise((r) => (resolve = () => r(null))));
    const first = outbox.flush(request);
    const second = outbox.flush(request);
    await vi.waitFor(() => expect(request).toHaveBeenCalled());
    resolve();
    expect(await first).toEqual(await second);
    expect(request).toHaveBeenCalledTimes(1);
    expect(counts.at(-1)).toBe(0);
  });
});
