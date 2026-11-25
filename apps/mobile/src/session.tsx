import { createApiClient, Outbox, type ApiClient, type QueuedWrite } from '@vigortally/client';
import type { User } from '@vigortally/schema';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { kv } from './storage';

/** A paired server: where it is and the device token it gave us. */
export interface Pairing {
  serverUrl: string;
  token: string;
  user: User;
}

const PAIRING_KEY = 'vigortally.pairing';
const FLUSH_INTERVAL_MS = 15_000;

interface SessionValue {
  /** null while loading or when not paired yet. */
  pairing: Pairing | null;
  loading: boolean;
  api: ApiClient | null;
  /** Writes made offline that haven't reached the server yet. */
  pendingWrites: number;
  savePairing(pairing: Pairing): Promise<void>;
  unpair(): Promise<void>;
  /** Queues a write and tries to send it right away. */
  write(method: QueuedWrite['method'], path: string, body?: unknown): Promise<void>;
  syncNow(): Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);
const outbox = new Outbox(kv);
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingWrites, setPending] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await SecureStore.getItemAsync(PAIRING_KEY);
        if (raw) setPairing(JSON.parse(raw) as Pairing);
      } finally {
        setLoading(false);
      }
    })();
    void outbox.load();
    return outbox.subscribe(setPending);
  }, []);

  const unpair = useCallback(async () => {
    await SecureStore.deleteItemAsync(PAIRING_KEY);
    queryClient.clear();
    setPairing(null);
  }, []);

  const api = useMemo(
    () =>
      pairing
        ? createApiClient({
            baseUrl: pairing.serverUrl,
            getToken: () => pairing.token,
            // A revoked device token means this phone was signed out on the web.
            onUnauthorized: () => void unpair(),
          })
        : null,
    [pairing, unpair],
  );

  const syncNow = useCallback(async () => {
    if (!api) return;
    const result = await outbox.flush(api.request);
    if (result.sent > 0 || result.rejected.length > 0) await queryClient.invalidateQueries();
  }, [api]);

  // Send queued writes regularly and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!api) return;
    void syncNow();
    const timer = setInterval(() => void syncNow(), FLUSH_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [api, syncNow]);

  const value = useMemo<SessionValue>(
    () => ({
      pairing,
      loading,
      api,
      pendingWrites,
      savePairing: async (next) => {
        await SecureStore.setItemAsync(PAIRING_KEY, JSON.stringify(next));
        setPairing(next);
      },
      unpair,
      write: async (method, path, body) => {
        await outbox.enqueue({ method, path, body });
        void syncNow();
      },
      syncNow,
    }),
    [pairing, loading, api, pendingWrites, unpair, syncNow],
  );

  return (
    <SessionContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

/** The API client of a paired session (screens behind the pairing gate only). */
export function useApi(): ApiClient {
  const { api } = useSession();
  if (!api) throw new Error('Not paired');
  return api;
}
