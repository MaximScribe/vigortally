import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage, Form, TextField } from '../components/forms';
import { useRefreshAuth } from './AuthGate';

/** First run: create the admin account and the household. */
export function SetupScreen() {
  const api = useApi();
  const refresh = useRefreshAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', householdName: 'Home' });
  const setup = useMutation({ mutationFn: api.auth.setup, onSuccess: refresh });
  const update = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="vt-auth">
      <div className="vt-auth__card">
        <div className="vt-auth__brand">VigorTally</div>
        <h1 className="vt-display">Welcome</h1>
        <p className="vt-muted">
          Create the admin account for this server. You can add the rest of your household
          afterwards.
        </p>
        <Form onSubmit={() => setup.mutate(form)}>
          <TextField label="Your name" required value={form.name} onChange={update('name')} />
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={form.email}
            onChange={update('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            hint="At least 8 characters"
            value={form.password}
            onChange={update('password')}
          />
          <TextField
            label="Household name"
            required
            value={form.householdName}
            onChange={update('householdName')}
          />
          <ErrorMessage error={setup.error} />
          <Button type="submit" block busy={setup.isPending}>
            Create account
          </Button>
        </Form>
      </div>
    </div>
  );
}
