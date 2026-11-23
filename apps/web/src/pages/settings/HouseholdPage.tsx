import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { useMe } from '../../auth/AuthGate';
import { Button, ErrorMessage, Form, TextField } from '../../components/forms';
import { Page, Section } from '../../components/Page';
import '../../components/list.css';

export function HouseholdPage() {
  const api = useApi();
  const me = useMe();
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: ['users'], queryFn: api.users.list });
  const remove = useMutation({
    mutationFn: api.users.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
  const isAdmin = me.user.role === 'admin';

  return (
    <Page title="Household">
      <Section label="Members">
        <ul className="vt-list">
          {members.data?.map((member) => (
            <li key={member.id} className="vt-list__item">
              <div className="vt-list__main">
                <span>{member.name}</span>
                <span className="vt-list__sub">
                  {member.email} · {member.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
              {isAdmin && member.id !== me.user.id && (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm(`Remove ${member.name} and all their data?`)) {
                      remove.mutate(member.id);
                    }
                  }}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
        <ErrorMessage error={members.error ?? remove.error} />
      </Section>

      {isAdmin && <AddMember />}
    </Page>
  );
}

function AddMember() {
  const api = useApi();
  const queryClient = useQueryClient();
  const empty = { name: '', email: '', password: '' };
  const [form, setForm] = useState(empty);
  const create = useMutation({
    mutationFn: api.users.create,
    onSuccess: async () => {
      setForm(empty);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
  const update = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Section label="Add a member">
      <Form className="vt-card" onSubmit={() => create.mutate(form)}>
        <p className="vt-muted" style={{ margin: 0 }}>
          Members share recipes, the meal plan and the shopping list. Diaries and workouts stay
          personal.
        </p>
        <TextField label="Name" required value={form.name} onChange={update('name')} />
        <TextField
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={update('email')}
        />
        <TextField
          label="Temporary password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={form.password}
          onChange={update('password')}
        />
        <ErrorMessage error={create.error} />
        <Button type="submit" busy={create.isPending}>
          Add member
        </Button>
      </Form>
    </Section>
  );
}
