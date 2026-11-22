import { useCallback, useState } from 'react';
import {
  applyThemePreference,
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '../theme';

/** Current theme preference plus a setter that applies and remembers it. */
export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadThemePreference);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    saveThemePreference(next);
    applyThemePreference(next);
  }, []);

  return [preference, setPreference] as const;
}
