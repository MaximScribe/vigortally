import { createApiClient } from '@vigortally/client';
import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../api/ApiProvider';
import { AuthGate } from '../auth/AuthGate';
import { createAppRouter } from '../router';
import { FakeServer } from './fakeServer';

/** Renders the whole app at `path` against a fake API server. */
export function renderApp(path = '/', server = new FakeServer()) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const api = createApiClient({ baseUrl: '', fetch: server.fetch });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  const utils = render(
    <ApiProvider client={api} queryClient={queryClient}>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </ApiProvider>,
  );
  return { ...utils, router, user, server, queryClient };
}
