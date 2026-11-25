import { newWorkoutExercise } from '@vigortally/core';
import { formatDuration } from '@vigortally/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { useMe } from '../auth/AuthGate';
import { Button, ErrorMessage } from '../components/forms';
import { useNow } from '../hooks/useNow';
import {
  completedWorkout,
  discardWorkout,
  updateWorkout,
  useActiveWorkout,
  type ActiveWorkout,
} from './activeWorkout';
import { ExerciseBlock } from './ExerciseBlock';
import { ExercisePicker, useExercises } from './ExercisePicker';
import { RestTimer } from './RestTimer';
import './workout.css';

/** Full-screen logger for the active workout. */
export function WorkoutPage() {
  const workout = useActiveWorkout();
  if (!workout) return <Navigate to="/activities" />;
  return <Logger workout={workout} />;
}

function Logger({ workout }: { workout: ActiveWorkout }) {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const units = useMe().profile.units;
  const exercises = useExercises();
  const [picking, setPicking] = useState(false);
  const now = useNow(1000);
  const elapsed = (now - new Date(workout.startedAt).getTime()) / 1000;

  const exerciseIds = [...new Set(workout.exercises.map((e) => e.exerciseId))].sort();
  const previous = useQuery({
    queryKey: ['previous-sets', exerciseIds],
    queryFn: () => api.workouts.previous(exerciseIds),
    enabled: exerciseIds.length > 0,
  });

  const finish = useMutation({
    mutationFn: api.workouts.save,
    onSuccess: async () => {
      discardWorkout();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workouts'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['templates'] }),
        queryClient.invalidateQueries({ queryKey: ['previous-sets'] }),
      ]);
      await navigate({ to: '/activities' });
    },
  });

  function onFinish() {
    const result = completedWorkout(workout, new Date());
    if (result.exercises.length === 0) {
      if (window.confirm('No sets are checked off. Discard this workout?')) {
        discardWorkout();
        void navigate({ to: '/activities' });
      }
      return;
    }
    const unchecked = workout.exercises.some((e) => e.sets.some((s) => !s.done));
    if (unchecked && !window.confirm('Unchecked sets will not be saved. Finish anyway?')) return;
    finish.mutate(result);
  }

  return (
    <div className="vt-logger">
      <header className="vt-logger__bar">
        <button
          type="button"
          className="vt-icon-button"
          aria-label="Minimise workout"
          onClick={() => void navigate({ to: '/activities' })}
        >
          <ChevronDown aria-hidden="true" size={26} />
        </button>
        <RestTimer workout={workout} />
        <span className="vt-logger__elapsed" aria-label="Elapsed time">
          {formatDuration(elapsed)}
        </span>
        <button
          type="button"
          className="vt-logger__finish"
          onClick={onFinish}
          disabled={finish.isPending}
        >
          Finish
        </button>
      </header>

      <div className="vt-logger__content">
        <input
          className="vt-logger__name"
          aria-label="Workout name"
          value={workout.name}
          onChange={(e) => updateWorkout((w) => ({ ...w, name: e.target.value }))}
        />
        <textarea
          className="vt-logger__notes"
          aria-label="Workout notes"
          placeholder="Notes"
          rows={1}
          value={workout.notes}
          onChange={(e) => updateWorkout((w) => ({ ...w, notes: e.target.value }))}
        />

        {workout.exercises.map((entry, index) => (
          <ExerciseBlock
            key={`${entry.exerciseId}-${index}`}
            index={index}
            entry={entry}
            exercise={exercises.byId.get(entry.exerciseId)}
            previous={previous.data?.[entry.exerciseId]}
            units={units}
          />
        ))}

        <ErrorMessage error={finish.error} />
        <Button variant="secondary" block onClick={() => setPicking(true)}>
          Add exercises
        </Button>
        <Button
          variant="danger"
          block
          onClick={() => {
            if (window.confirm('Cancel this workout? Nothing will be saved.')) {
              discardWorkout();
              void navigate({ to: '/activities' });
            }
          }}
        >
          Cancel workout
        </Button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onAdd={(ids) =>
          updateWorkout((w) => ({
            ...w,
            exercises: [...w.exercises, ...ids.map(newWorkoutExercise)],
          }))
        }
      />
    </div>
  );
}
