import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage, Form, TextField } from '../components/forms';
import { useRefreshAuth } from './AuthGate';

export function LoginScreen() {
  const api = useApi();
  const refresh = useRefreshAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({ mutationFn: api.auth.login, onSuccess: refresh });

  return (
    <div className="vt-auth">
      <div className="vt-auth__card">
        <div className="vt-auth__brand">VigorTally</div>
        <h1 className="vt-display">Sign in</h1>
        <Form onSubmit={() => login.mutate({ email, password })}>
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorMessage error={login.error} />
          <Button type="submit" block busy={login.isPending}>
            Sign in
          </Button>
        </Form>
      </div>
    </div>
  );
}
