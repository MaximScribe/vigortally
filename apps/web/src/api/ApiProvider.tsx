import { createApiClient, type ApiClient } from '@vigortally/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

const ApiContext = createContext<ApiClient | null>(null);

/** The web app talks to the server it was loaded from and authenticates with a cookie. */
export function createWebApiClient(onUnauthorized?: () => void): ApiClient {
  return createApiClient({ baseUrl: '', onUnauthorized });
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof Error && 'status' in error && error.status !== 0),
        refetchOnWindowFocus: true,
      },
    },
  });
}

interface ApiProviderProps {
  children: ReactNode;
  /** Injected in tests. */
  client?: ApiClient;
  queryClient?: QueryClient;
}

export function ApiProvider({ children, client, queryClient }: ApiProviderProps) {
  const [api] = useState(() => client ?? createWebApiClient());
  const [queries] = useState(() => queryClient ?? createQueryClient());
  return (
    <ApiContext.Provider value={api}>
      <QueryClientProvider client={queries}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}

export function useApi(): ApiClient {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used inside <ApiProvider>');
  return api;
}
