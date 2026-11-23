import { exerciseDisplayName } from '@vigortally/core';
import type { Template } from '@vigortally/schema';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage } from '../components/forms';
import { EmptyState, Section } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { formatDay } from '../lib/format';
import { emptySet, getActiveWorkout, startWorkout } from './activeWorkout';
import { useExercises } from './ExercisePicker';

/** "My templates" on the Activities page. */
export function Templates() {
  const api = useApi();
  const navigate = useNavigate();
  const templates = useQuery({ queryKey: ['templates'], queryFn: api.templates.list });
  const exercises = useExercises();
  const [chosen, setChosen] = useState<Template | null>(null);

  function start(template: Template) {
    if (getActiveWorkout() && !window.confirm('Replace the workout in progress?')) return;
    startWorkout({
      name: template.name,
      templateId: template.id,
      exercises: template.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => ({ ...emptySet(s.type), weightKg: s.weightKg, reps: s.reps })),
      })),
    });
    void navigate({ to: '/workout' });
  }

  return (
    <Section
      label="My templates"
      action={
        <button
          type="button"
          className="vt-icon-button"
          aria-label="New template"
          onClick={() =>
            void navigate({ to: '/templates/$templateId', params: { templateId: 'new' } })
          }
        >
          <Plus aria-hidden="true" size={24} />
        </button>
      }
    >
      {templates.data?.length === 0 && (
        <EmptyState title="No templates yet">
          Save the workouts you repeat, like Upper and Lower, and start them with one tap.
        </EmptyState>
      )}
      <div className="vt-templates">
        {templates.data?.map((template) => (
          <button
            key={template.id}
            type="button"
            className="vt-card vt-template"
            onClick={() => setChosen(template)}
          >
            <span className="vt-title">{template.name}</span>
            <span className="vt-muted">
              {template.lastPerformedAt
                ? `Last performed: ${formatDay(template.lastPerformedAt)}`
                : 'Not performed yet'}
            </span>
            <span className="vt-template__exercises">
              {template.exercises.map((e, i) => {
                const exercise = exercises.byId.get(e.exerciseId);
                return (
                  <span
                    key={`${e.exerciseId}-${i}`}
                    className={e.supersetGroup != null ? 'vt-template__superset' : undefined}
                  >
                    {e.sets.length} × {exercise ? exerciseDisplayName(exercise) : '…'}
                  </span>
                );
              })}
            </span>
            {template.notes && <em className="vt-muted">{template.notes}</em>}
          </button>
        ))}
      </div>
      <ErrorMessage error={templates.error} />

      <Sheet
        open={chosen != null}
        title={chosen?.name ?? ''}
        onClose={() => setChosen(null)}
        footer={
          chosen && (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  void navigate({ to: '/templates/$templateId', params: { templateId: chosen.id } })
                }
              >
                Edit
              </Button>
              <Button onClick={() => start(chosen)}>Start workout</Button>
            </>
          )
        }
      >
        {chosen && (
          <ul className="vt-template__preview">
            {chosen.exercises.map((e, i) => {
              const exercise = exercises.byId.get(e.exerciseId);
              return (
                <li key={`${e.exerciseId}-${i}`}>
                  {e.sets.length} × {exercise ? exerciseDisplayName(exercise) : '…'}
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </Section>
  );
}
