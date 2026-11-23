import type { ActivityPreset } from '@vigortally/core';
import type { ActivityField, ActivityTypeSummary, FieldType } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../api/ApiProvider';
import { Button, ErrorMessage, SelectField, TextField } from '../../components/forms';
import { Sheet } from '../../components/Sheet';
import { activityIcon } from '../../lib/icons';
import { newId } from '../../lib/ids';
import '../../components/list.css';

interface Props {
  open: boolean;
  onClose: () => void;
  existing: readonly ActivityTypeSummary[];
}

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'distance', label: 'Distance' },
  { value: 'duration', label: 'Duration' },
  { value: 'text', label: 'Text' },
];

/** Turns a label into a field key: "Max grade" -> "maxGrade". */
function toKey(label: string, taken: Set<string>): string {
  const words = label
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let key =
    words
      .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
      .join('') || 'field';
  if (!/^[a-z]/.test(key)) key = `f${key}`;
  let candidate = key;
  for (let n = 2; taken.has(candidate); n++) candidate = `${key}${n}`;
  return candidate.slice(0, 40);
}

export function AddActivitySheet({ open, onClose, existing }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();
  const presets = useQuery({ queryKey: ['activity-presets'], queryFn: api.activities.presets });
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<ActivityField[]>([]);

  const save = useMutation({
    mutationFn: api.activities.save,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      close();
    },
  });

  function close() {
    setMode('presets');
    setName('');
    setFields([]);
    onClose();
  }

  const usedPresets = new Set(existing.map((a) => a.presetKey));
  const available = (presets.data ?? []).filter((p) => !usedPresets.has(p.key));

  const addPreset = (preset: ActivityPreset) =>
    save.mutate({
      id: newId(),
      name: preset.name,
      kind: preset.kind,
      presetKey: preset.key,
      icon: preset.icon,
      fields: preset.fields,
    });

  const addField = () => {
    const taken = new Set(fields.map((f) => f.key));
    setFields((f) => [...f, { key: toKey('Value', taken), label: '', type: 'number' }]);
  };

  const updateField = (index: number, patch: Partial<ActivityField>) =>
    setFields((all) =>
      all.map((field, i) => {
        if (i !== index) return field;
        const next = { ...field, ...patch };
        if (patch.label !== undefined) {
          const taken = new Set(all.filter((_, j) => j !== i).map((f) => f.key));
          next.key = toKey(patch.label, taken);
        }
        return next;
      }),
    );

  return (
    <Sheet
      open={open}
      title={mode === 'presets' ? 'Add activity' : 'Custom activity'}
      onClose={close}
      footer={
        mode === 'custom' && (
          <>
            <Button variant="secondary" onClick={() => setMode('presets')}>
              Back
            </Button>
            <Button
              busy={save.isPending}
              disabled={!name.trim() || fields.some((f) => !f.label.trim())}
              onClick={() =>
                save.mutate({
                  id: newId(),
                  name: name.trim(),
                  kind: 'session',
                  icon: 'activity',
                  fields: fields.map((f) => ({ ...f, label: f.label.trim() })),
                })
              }
            >
              Add
            </Button>
          </>
        )
      }
    >
      {mode === 'presets' ? (
        <>
          <ul className="vt-list">
            {available.map((preset) => {
              const Icon = activityIcon(preset.icon);
              return (
                <li key={preset.key}>
                  <button
                    type="button"
                    className="vt-list__item vt-list__item--button"
                    onClick={() => addPreset(preset)}
                    disabled={save.isPending}
                  >
                    <Icon aria-hidden="true" size={22} className="vt-accent" />
                    <span className="vt-list__main">
                      <span>{preset.name}</span>
                      <span className="vt-list__sub">
                        {preset.kind === 'strength'
                          ? 'Sets, reps and weights'
                          : preset.fields.map((f) => f.label).join(', ') || 'Duration and notes'}
                      </span>
                    </span>
                    <Plus aria-hidden="true" size={18} />
                  </button>
                </li>
              );
            })}
            {available.length === 0 && presets.isSuccess && (
              <li className="vt-list__empty">You&apos;ve added every preset.</li>
            )}
          </ul>
          <Button variant="secondary" onClick={() => setMode('custom')}>
            Create custom activity
          </Button>
        </>
      ) : (
        <>
          <TextField
            label="Name"
            placeholder="e.g. Boxing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <p className="vt-muted" style={{ margin: 0 }}>
            Every session records date, duration and notes. Add the values you want to track.
          </p>
          {fields.map((field, index) => (
            <div key={index} className="vt-row vt-row--end">
              <TextField
                label="Field"
                placeholder="e.g. Rounds"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
              />
              <SelectField
                label="Type"
                value={field.type}
                options={fieldTypes}
                onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
              />
              {field.type === 'number' && (
                <TextField
                  label="Unit"
                  placeholder="optional"
                  value={field.unit ?? ''}
                  onChange={(e) => updateField(index, { unit: e.target.value || undefined })}
                />
              )}
              <button
                type="button"
                className="vt-icon-button"
                aria-label={`Remove ${field.label || 'field'}`}
                onClick={() => setFields((all) => all.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
          ))}
          <Button variant="ghost" onClick={addField} disabled={fields.length >= 12}>
            <Plus aria-hidden="true" size={18} /> Add field
          </Button>
        </>
      )}
      <ErrorMessage error={save.error ?? presets.error} />
    </Sheet>
  );
}
