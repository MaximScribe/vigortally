import { displayDistance, formatDuration, M_PER_MILE, parseDuration } from '@vigortally/core';
import type { ActivitySession, ActivityType } from '@vigortally/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { useMe } from '../../auth/AuthGate';
import { Button, ErrorMessage, TextField } from '../../components/forms';
import { Sheet } from '../../components/Sheet';
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/format';
import { newId } from '../../lib/ids';

interface Props {
  activity: ActivityType;
  /** Session to edit; a new one is created when null. Mount with a `key` per session. */
  session: ActivitySession | null;
  open: boolean;
  onClose: () => void;
}

type Draft = { startedAt: string; duration: string; notes: string; values: Record<string, string> };

function toDraft(
  activity: ActivityType,
  session: ActivitySession | null,
  imperial: boolean,
): Draft {
  const values: Record<string, string> = {};
  for (const field of activity.fields) {
    const value = session?.values[field.key];
    if (value == null) values[field.key] = '';
    else if (field.type === 'distance' && typeof value === 'number')
      values[field.key] = String(displayDistance(value, imperial ? 'imperial' : 'metric').value);
    else if (field.type === 'duration' && typeof value === 'number')
      values[field.key] = formatDuration(value);
    else values[field.key] = String(value);
  }
  return {
    startedAt: toDateTimeLocal(session ? new Date(session.startedAt) : new Date()),
    duration: session?.durationSec != null ? formatDuration(session.durationSec) : '',
    notes: session?.notes ?? '',
    values,
  };
}

export function SessionSheet({ activity, session, open, onClose }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();
  const imperial = useMe().profile.units === 'imperial';
  const [draft, setDraft] = useState<Draft>(() => toDraft(activity, session, imperial));
  const [problem, setProblem] = useState<string | null>(null);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sessions'] }),
      queryClient.invalidateQueries({ queryKey: ['activities'] }),
    ]);
  const save = useMutation({ mutationFn: api.sessions.save, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.sessions.remove, onSuccess: invalidate });

  function submit() {
    const durationSec = draft.duration.trim() ? parseDuration(draft.duration) : null;
    if (draft.duration.trim() && durationSec == null) {
      setProblem('Enter the duration as h:mm:ss, mm:ss or minutes.');
      return;
    }
    const values: Record<string, number | string> = {};
    for (const field of activity.fields) {
      const raw = draft.values[field.key]?.trim() ?? '';
      if (!raw) continue;
      if (field.type === 'text') values[field.key] = raw;
      else if (field.type === 'duration') {
        const sec = parseDuration(raw);
        if (sec == null) return setProblem(`${field.label}: enter h:mm:ss or minutes.`);
        values[field.key] = sec;
      } else {
        const n = Number(raw.replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) return setProblem(`${field.label} must be a number.`);
        values[field.key] =
          field.type === 'distance' ? Math.round(n * (imperial ? M_PER_MILE : 1000)) : n;
      }
    }
    save.mutate(
      {
        id: session?.id ?? newId(),
        activityTypeId: activity.id,
        startedAt: fromDateTimeLocal(draft.startedAt),
        durationSec,
        values,
        notes: draft.notes.trim(),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Sheet
      open={open}
      title={session ? `Edit ${activity.name}` : `Log ${activity.name}`}
      onClose={onClose}
      footer={
        <>
          {session && (
            <Button
              variant="danger"
              busy={remove.isPending}
              onClick={() => {
                if (window.confirm('Delete this session?')) {
                  remove.mutate(session.id, { onSuccess: onClose });
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button busy={save.isPending} onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <div className="vt-row">
        <TextField
          label="Start"
          type="datetime-local"
          value={draft.startedAt}
          onChange={(e) => setDraft((d) => ({ ...d, startedAt: e.target.value }))}
        />
        <TextField
          label="Duration"
          placeholder="h:mm:ss"
          inputMode="numeric"
          value={draft.duration}
          onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
        />
      </div>
      {activity.fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          inputMode={field.type === 'text' ? 'text' : 'decimal'}
          placeholder={field.type === 'duration' ? 'h:mm:ss' : undefined}
          suffix={
            field.type === 'distance'
              ? imperial
                ? 'mi'
                : 'km'
              : field.type === 'number'
                ? field.unit
                : undefined
          }
          value={draft.values[field.key] ?? ''}
          onChange={(e) =>
            setDraft((d) => ({ ...d, values: { ...d.values, [field.key]: e.target.value } }))
          }
        />
      ))}
      <div className="vt-field">
        <label className="vt-field__label" htmlFor="session-notes">
          Notes
        </label>
        <textarea
          id="session-notes"
          className="vt-input"
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        />
      </div>
      {problem && <p className="vt-error">{problem}</p>}
      <ErrorMessage error={save.error ?? remove.error} />
    </Sheet>
  );
}
