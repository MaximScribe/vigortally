import type { Profile } from '@vigortally/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { meQueryKey, useMe } from '../../auth/AuthGate';
import { Button, ErrorMessage, Form, SelectField, TextField } from '../../components/forms';
import { Page, Section } from '../../components/Page';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ProfilePage() {
  const api = useApi();
  const me = useMe();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Profile>(me.profile);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: api.me.updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(meQueryKey, { ...me, profile });
      setSaved(true);
    },
  });

  const setTarget = (key: keyof Profile['targets']) => (e: { target: { value: string } }) => {
    setSaved(false);
    setDraft((d) => ({ ...d, targets: { ...d.targets, [key]: Number(e.target.value) } }));
  };

  return (
    <Page title="Profile & goals">
      <Section label={me.user.name}>
        <p className="vt-muted" style={{ margin: 0 }}>
          {me.user.email} · {me.user.role === 'admin' ? 'Admin' : 'Member'}
        </p>
      </Section>

      <Form onSubmit={() => save.mutate(draft)}>
        <Section label="Daily targets">
          <div className="vt-card vt-form">
            <TextField
              label="Calories"
              type="number"
              inputMode="numeric"
              min={0}
              suffix="kcal"
              value={draft.targets.kcal}
              onChange={setTarget('kcal')}
            />
            <div className="vt-row">
              <TextField
                label="Protein"
                type="number"
                min={0}
                suffix="g"
                value={draft.targets.protein}
                onChange={setTarget('protein')}
              />
              <TextField
                label="Carbs"
                type="number"
                min={0}
                suffix="g"
                value={draft.targets.carbs}
                onChange={setTarget('carbs')}
              />
              <TextField
                label="Fat"
                type="number"
                min={0}
                suffix="g"
                value={draft.targets.fat}
                onChange={setTarget('fat')}
              />
            </div>
            <TextField
              label="Water"
              type="number"
              min={0}
              step={50}
              suffix="ml"
              value={draft.targets.waterMl}
              onChange={setTarget('waterMl')}
            />
          </div>
        </Section>

        <Section label="Preferences">
          <div className="vt-card vt-form">
            <SelectField
              label="Units"
              value={draft.units}
              onChange={(e) => {
                setSaved(false);
                setDraft((d) => ({ ...d, units: e.target.value as Profile['units'] }));
              }}
              options={[
                { value: 'metric', label: 'Metric (kg, km)' },
                { value: 'imperial', label: 'Imperial (lb, mi)' },
              ]}
            />
            <SelectField
              label="Usual shopping day"
              value={String(draft.shoppingDay)}
              onChange={(e) => {
                setSaved(false);
                setDraft((d) => ({ ...d, shoppingDay: Number(e.target.value) }));
              }}
              options={weekdays.map((label, value) => ({ value: String(value), label }))}
            />
          </div>
        </Section>

        <ErrorMessage error={save.error} />
        <Button type="submit" busy={save.isPending}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      </Form>

      <ChangePassword />
    </Page>
  );
}

function ChangePassword() {
  const api = useApi();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const change = useMutation({
    mutationFn: api.me.changePassword,
    onSuccess: () => {
      setCurrent('');
      setNew('');
    },
  });

  return (
    <Section label="Password">
      <Form className="vt-card" onSubmit={() => change.mutate({ currentPassword, newPassword })}>
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
        />
        <ErrorMessage error={change.error} />
        {change.isSuccess && (
          <p className="vt-muted">Password changed. Other sessions were signed out.</p>
        )}
        <Button type="submit" variant="secondary" busy={change.isPending}>
          Change password
        </Button>
      </Form>
    </Section>
  );
}
