import type { WorkoutExercise } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { useMe } from '../auth/AuthGate';
import { Button, ErrorMessage, TextField } from '../components/forms';
import { EmptyState, Page } from '../components/Page';
import { newId } from '../lib/ids';
import { emptySet } from './activeWorkout';
import { ExerciseBlock } from './ExerciseBlock';
import { ExercisePicker, useExercises } from './ExercisePicker';
import './workout.css';

export function TemplateEditorPage() {
  const { templateId } = useParams({ from: '/templates/$templateId' });
  const api = useApi();
  const templates = useQuery({ queryKey: ['templates'], queryFn: api.templates.list });
  if (templateId !== 'new' && templates.isPending) return null;
  const existing = templates.data?.find((t) => t.id === templateId) ?? null;
  if (templateId !== 'new' && !existing) {
    return (
      <Page title="Template">
        <EmptyState title="Template not found">It may have been deleted.</EmptyState>
      </Page>
    );
  }
  return (
    <Editor
      key={templateId}
      initial={
        existing ?? { id: newId(), name: '', notes: '', exercises: [], lastPerformedAt: null }
      }
      isNew={!existing}
    />
  );
}

interface Draft {
  id: string;
  name: string;
  notes: string;
  exercises: WorkoutExercise[];
}

function Editor({ initial, isNew }: { initial: Draft; isNew: boolean }) {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const units = useMe().profile.units;
  const exercises = useExercises();
  const [draft, setDraft] = useState<Draft>(initial);
  const [picking, setPicking] = useState(false);

  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: ['templates'] });
    await navigate({ to: '/activities' });
  };
  const save = useMutation({ mutationFn: api.templates.save, onSuccess: done });
  const remove = useMutation({ mutationFn: api.templates.remove, onSuccess: done });

  const updateExercise = (index: number) => (update: (entry: WorkoutExercise) => WorkoutExercise) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => (i === index ? update(e) : e)),
    }));

  return (
    <Page title={isNew ? 'New template' : 'Edit template'}>
      <TextField
        label="Name"
        placeholder="e.g. Upper"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
      />
      <TextField
        label="Notes"
        placeholder="e.g. After climbing"
        value={draft.notes}
        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
      />

      {draft.exercises.map((entry, index) => (
        <ExerciseBlock
          key={`${entry.exerciseId}-${index}`}
          index={index}
          entry={entry}
          exercise={exercises.byId.get(entry.exerciseId)}
          previous={undefined}
          units={units}
          mode="template"
          onChange={updateExercise(index)}
          onRemove={() =>
            setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== index) }))
          }
        />
      ))}

      <Button variant="secondary" onClick={() => setPicking(true)}>
        Add exercises
      </Button>
      <ErrorMessage error={save.error ?? remove.error} />
      <div className="vt-row">
        {!isNew && (
          <Button
            variant="danger"
            busy={remove.isPending}
            onClick={() => {
              if (window.confirm('Delete this template? Past workouts are kept.')) {
                remove.mutate(draft.id);
              }
            }}
          >
            Delete
          </Button>
        )}
        <Button
          busy={save.isPending}
          disabled={!draft.name.trim() || draft.exercises.length === 0}
          onClick={() =>
            save.mutate({ ...draft, name: draft.name.trim(), notes: draft.notes.trim() })
          }
        >
          Save template
        </Button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onAdd={(ids) =>
          setDraft((d) => ({
            ...d,
            exercises: [
              ...d.exercises,
              ...ids.map((exerciseId) => ({
                exerciseId,
                supersetGroup: null,
                note: '',
                sets: [emptySet(), emptySet(), emptySet()],
              })),
            ],
          }))
        }
      />
    </Page>
  );
}
