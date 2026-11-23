import type { Me } from '@vigortally/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from '../api/ApiProvider';
import { LoginScreen } from './LoginScreen';
import { SetupScreen } from './SetupScreen';
import './auth.css';

const MeContext = createContext<Me | null>(null);

export const meQueryKey = ['me'] as const;

/**
 * Shows the first-run setup on a fresh server, the login screen when signed out, and the
 * app otherwise. Everything inside can use `useMe()`.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const api = useApi();
  const setup = useQuery({ queryKey: ['setup'], queryFn: api.auth.setupStatus });
  const me = useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      try {
        return await api.me.get();
      } catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 401) return null;
        throw error;
      }
    },
    enabled: setup.data?.setupRequired === false,
  });

  if (setup.isPending || (setup.data?.setupRequired === false && me.isPending)) {
    return <div className="vt-splash" aria-busy="true" />;
  }
  if (setup.isError || me.isError) {
    return (
      <div className="vt-auth">
        <div className="vt-auth__card">
          <h1 className="vt-title">Can&apos;t reach VigorTally</h1>
          <p className="vt-muted">The server didn&apos;t answer. Check that it is running.</p>
        </div>
      </div>
    );
  }
  if (setup.data.setupRequired) return <SetupScreen />;
  if (!me.data) return <LoginScreen />;

  return <MeContext.Provider value={me.data}>{children}</MeContext.Provider>;
}

/** The signed-in user and their profile. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe must be used inside <AuthGate>');
  return me;
}

/** Refetch setup state and the current user (after login, logout or setup). */
export function useRefreshAuth() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['setup'] });
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
  };
}
