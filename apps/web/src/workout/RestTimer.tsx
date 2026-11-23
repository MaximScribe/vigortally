import { formatDuration } from '@vigortally/core';
import { Timer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/forms';
import { Sheet } from '../components/Sheet';
import { useNow } from '../hooks/useNow';
import { updateWorkout, type ActiveWorkout } from './activeWorkout';

const choices = [0, 60, 90, 120, 180, 240];

/** Rest countdown in the logger's top bar. Tap to change the rest length. */
export function RestTimer({ workout }: { workout: ActiveWorkout }) {
  const now = useNow(250, workout.restEndsAt != null);
  const [open, setOpen] = useState(false);
  const remaining = workout.restEndsAt ? Math.max(0, workout.restEndsAt - now) : 0;
  const running = remaining > 0;

  // Buzz once when the rest is over, then clear it.
  const ended = useRef(false);
  useEffect(() => {
    if (workout.restEndsAt && remaining === 0 && !ended.current) {
      ended.current = true;
      navigator.vibrate?.([200, 100, 200]);
      updateWorkout((w) => ({ ...w, restEndsAt: null }));
    }
    if (remaining > 0) ended.current = false;
  }, [remaining, workout.restEndsAt]);

  const adjust = (seconds: number) =>
    updateWorkout((w) => ({
      ...w,
      restEndsAt: w.restEndsAt ? Math.max(Date.now(), w.restEndsAt + seconds * 1000) : null,
    }));

  return (
    <>
      <button
        type="button"
        className={`vt-rest ${running ? 'vt-rest--running' : ''}`}
        onClick={() => setOpen(true)}
        aria-label={running ? `Rest timer, ${formatDuration(remaining / 1000)} left` : 'Rest timer'}
      >
        <Timer aria-hidden="true" size={20} />
        {running && <span>{formatDuration(Math.ceil(remaining / 1000))}</span>}
      </button>
      <Sheet open={open} title="Rest timer" onClose={() => setOpen(false)}>
        {running && (
          <div className="vt-rest__now">
            <span className="vt-rest__big">{formatDuration(Math.ceil(remaining / 1000))}</span>
            <div className="vt-row">
              <Button variant="secondary" onClick={() => adjust(-15)}>
                −15s
              </Button>
              <Button variant="secondary" onClick={() => adjust(15)}>
                +15s
              </Button>
              <Button
                variant="secondary"
                onClick={() => updateWorkout((w) => ({ ...w, restEndsAt: null }))}
              >
                Skip
              </Button>
            </div>
          </div>
        )}
        <p className="vt-label">Rest after each set</p>
        <div className="vt-segmented" role="radiogroup" aria-label="Rest length">
          {choices.map((seconds) => (
            <button
              key={seconds}
              type="button"
              role="radio"
              aria-checked={workout.restSeconds === seconds}
              className="vt-segmented__option"
              onClick={() => updateWorkout((w) => ({ ...w, restSeconds: seconds }))}
            >
              {seconds === 0 ? 'Off' : formatDuration(seconds)}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
