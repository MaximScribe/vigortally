import { formatDuration } from '@vigortally/core';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '../components/forms';
import { Section } from '../components/Page';
import { useNow } from '../hooks/useNow';
import { startWorkout, useActiveWorkout } from './activeWorkout';

/** "Quick start" on the Activities page: start a workout or get back to the running one. */
export function QuickStart() {
  const navigate = useNavigate();
  const active = useActiveWorkout();
  const now = useNow(1000, active != null);

  return (
    <Section label="Quick start">
      {active ? (
        <button
          type="button"
          className="vt-card vt-resume"
          onClick={() => void navigate({ to: '/workout' })}
        >
          <span className="vt-resume__dot" aria-hidden="true" />
          <span className="vt-list__main">
            <span className="vt-title">{active.name}</span>
            <span className="vt-muted">
              In progress · {formatDuration((now - new Date(active.startedAt).getTime()) / 1000)}
            </span>
          </span>
          <span className="vt-resume__action">Resume</span>
        </button>
      ) : (
        <Button
          block
          onClick={() => {
            startWorkout({});
            void navigate({ to: '/workout' });
          }}
        >
          Start an empty workout
        </Button>
      )}
    </Section>
  );
}
