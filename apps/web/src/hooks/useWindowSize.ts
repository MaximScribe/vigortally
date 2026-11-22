import { useSyncExternalStore } from 'react';
import type { Size } from '@vigortally/ui';

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

// Snapshots must be referentially stable between renders, so cache by value.
let cached: Size = { width: 0, height: 0 };
function getSnapshot(): Size {
  const { innerWidth: width, innerHeight: height } = window;
  if (cached.width !== width || cached.height !== height) cached = { width, height };
  return cached;
}

/** Current viewport size, updated on resize and rotation. */
export function useWindowSize(): Size {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
