import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useThemePreference } from '../hooks/useThemePreference';
import type { ThemePreference } from '../theme';

const options: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
];

/** Segmented control for the color theme. */
export function ThemeSwitch() {
  const [preference, setPreference] = useThemePreference();

  return (
    <div className="vt-segmented" role="radiogroup" aria-label="Theme">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          className="vt-segmented__option"
          onClick={() => setPreference(value)}
        >
          <Icon aria-hidden="true" size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}
