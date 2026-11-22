import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAppRouter } from '../router';

/** Renders the whole app at `path` with an in-memory history. */
export function renderApp(path = '/') {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const user = userEvent.setup();
  const utils = render(<RouterProvider router={router} />);
  return { ...utils, router, user };
}
