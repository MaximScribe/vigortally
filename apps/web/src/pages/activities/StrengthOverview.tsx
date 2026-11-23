import { displayWeight } from '@vigortally/core';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../api/ApiProvider';
import { useMe } from '../../auth/AuthGate';
import { ErrorMessage } from '../../components/forms';
import { EmptyState, Section } from '../../components/Page';
import { formatDay, formatNumber } from '../../lib/format';
import '../../components/list.css';

/** Strength training: past workouts. The logger and templates hook in here. */
export function StrengthOverview() {
  const api = useApi();
  const units = useMe().profile.units;
  const workouts = useQuery({ queryKey: ['workouts'], queryFn: () => api.workouts.list() });

  return (
    <Section label="History">
      {workouts.data?.length === 0 ? (
        <EmptyState title="No workouts yet">Finished workouts show up here.</EmptyState>
      ) : (
        <ul className="vt-list">
          {workouts.data?.map((workout) => {
            const sets = workout.exercises.reduce(
              (n, e) => n + e.sets.filter((s) => s.done).length,
              0,
            );
            const volume = displayWeight(workout.volumeKg, units);
            return (
              <li key={workout.id} className="vt-list__item">
                <span className="vt-list__main">
                  <span>{workout.name}</span>
                  <span className="vt-list__sub">
                    {formatDay(workout.startedAt)} · {workout.exercises.length} exercises · {sets}{' '}
                    sets
                  </span>
                </span>
                <span className="vt-list__value">
                  {formatNumber(volume.value, 0)} {volume.unit}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <ErrorMessage error={workouts.error} />
    </Section>
  );
}
