/**
 * Offline write queue for the companion app.
 *
 * Every write in the VigorTally API is an idempotent PUT/DELETE keyed by a client-made id,
 * so a queued change can be sent again after a lost connection without creating
 * duplicates. Writes are sent in the order they were made.
 */
import { ApiRequestError, type HttpMethod } from './http';

export interface QueuedWrite {
  /** Unique per queued item (not the record id). */
  key: string;
  method: Exclude<HttpMethod, 'GET'>;
  path: string;
  body?: unknown;
  queuedAt: string;
}

/** Minimal async key-value storage (expo-sqlite kv-store, AsyncStorage, Map in tests). */
export interface OutboxStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface FlushResult {
  sent: number;
  /** Rejected by the server (validation, deleted parent); dropped so the queue can move on. */
  rejected: { write: QueuedWrite; error: ApiRequestError }[];
  /** Still waiting because the server couldn't be reached or failed temporarily. */
  pending: number;
}

/** Sends one write; the API client's `request` fits. */
export type WriteSender = (
  method: QueuedWrite['method'],
  path: string,
  body?: unknown,
) => Promise<unknown>;

const STORAGE_KEY = 'vigortally.outbox';

export class Outbox {
  private queue: QueuedWrite[] = [];
  private loaded = false;
  private flushing: Promise<FlushResult> | null = null;
  private readonly listeners = new Set<(pending: number) => void>();
  private counter = 0;

  constructor(private readonly storage: OutboxStorage) {}

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await this.storage.getItem(STORAGE_KEY);
      this.queue = raw ? (JSON.parse(raw) as QueuedWrite[]) : [];
    } catch {
      this.queue = [];
    }
    this.loaded = true;
    this.notify();
  }

  get pending(): number {
    return this.queue.length;
  }

  subscribe(listener: (pending: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async enqueue(write: Omit<QueuedWrite, 'key' | 'queuedAt'>): Promise<void> {
    await this.load();
    this.queue.push({
      ...write,
      key: `${Date.now().toString(36)}-${(this.counter++).toString(36)}`,
      queuedAt: new Date().toISOString(),
    });
    await this.persist();
  }

  /** Sends queued writes in order until the queue is empty or the server is unreachable. */
  flush(request: WriteSender): Promise<FlushResult> {
    // One flush at a time; callers during a flush share its result.
    this.flushing ??= this.doFlush(request).finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async doFlush(request: WriteSender): Promise<FlushResult> {
    await this.load();
    const result: FlushResult = { sent: 0, rejected: [], pending: 0 };
    while (this.queue.length > 0) {
      const write = this.queue[0]!;
      try {
        await request(write.method, write.path, write.body);
        result.sent += 1;
      } catch (error) {
        const retryable =
          !(error instanceof ApiRequestError) ||
          error.isNetworkError ||
          error.status >= 500 ||
          error.status === 401 ||
          error.status === 408 ||
          error.status === 429;
        if (retryable) break;
        result.rejected.push({ write, error });
      }
      this.queue.shift();
      await this.persist();
    }
    result.pending = this.queue.length;
    return result;
  }

  private async persist(): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.queue.length);
  }
}
