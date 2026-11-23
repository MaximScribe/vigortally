import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiProvider } from './api/ApiProvider';
import { AuthGate } from './auth/AuthGate';
import { createAppRouter } from './router';
import './styles/base.css';
import { applyThemePreference, injectThemeTokens, loadThemePreference } from './theme';

injectThemeTokens();
applyThemePreference(loadThemePreference());

const router = createAppRouter();

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <ApiProvider>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </ApiProvider>
  </StrictMode>,
);
