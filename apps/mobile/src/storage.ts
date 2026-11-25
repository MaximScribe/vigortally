import type { OutboxStorage } from '@vigortally/client';
import Storage from 'expo-sqlite/kv-store';

/** Small persistent key-value store (SQLite under the hood) for the outbox and drafts. */
export const kv: OutboxStorage & { removeItem(key: string): Promise<void> } = {
  getItem: (key) => Storage.getItem(key),
  setItem: (key, value) => Storage.setItem(key, value),
  removeItem: (key) => Storage.removeItem(key),
};
