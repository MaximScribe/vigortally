/**
 * Activity presets offered when adding an activity. Each one is a starting point: the
 * user can rename it or change its fields afterwards, or build a custom activity.
 * Distances are stored in metres, durations in seconds.
 */
import type { ActivityField, ActivityKind } from '@vigortally/schema';

export interface ActivityPreset {
  key: string;
  name: string;
  kind: ActivityKind;
  icon: string;
  fields: ActivityField[];
}

const distance: ActivityField = { key: 'distance', label: 'Distance', type: 'distance' };
const elevation: ActivityField = {
  key: 'elevation',
  label: 'Elevation gain',
  type: 'number',
  unit: 'm',
};
const avgHeartRate: ActivityField = {
  key: 'avgHeartRate',
  label: 'Avg heart rate',
  type: 'number',
  unit: 'bpm',
};
const calories: ActivityField = {
  key: 'calories',
  label: 'Calories',
  type: 'number',
  unit: 'kcal',
};

export const activityPresets: readonly ActivityPreset[] = [
  { key: 'strength', name: 'Strength training', kind: 'strength', icon: 'dumbbell', fields: [] },
  {
    key: 'running',
    name: 'Running',
    kind: 'session',
    icon: 'footprints',
    fields: [distance, elevation, avgHeartRate, calories],
  },
  {
    key: 'cycling',
    name: 'Cycling',
    kind: 'session',
    icon: 'bike',
    fields: [distance, elevation, avgHeartRate, calories],
  },
  {
    key: 'swimming',
    name: 'Swimming',
    kind: 'session',
    icon: 'waves',
    fields: [distance, { key: 'laps', label: 'Laps', type: 'number' }, calories],
  },
  {
    key: 'hiking',
    name: 'Hiking',
    kind: 'session',
    icon: 'mountain',
    fields: [distance, elevation, calories],
  },
  {
    key: 'skiing',
    name: 'Skiing / snowboarding',
    kind: 'session',
    icon: 'snowflake',
    fields: [
      { key: 'runs', label: 'Runs', type: 'number' },
      { key: 'vertical', label: 'Vertical', type: 'number', unit: 'm' },
      distance,
      { key: 'topSpeed', label: 'Top speed', type: 'number', unit: 'km/h' },
    ],
  },
  {
    key: 'bouldering',
    name: 'Bouldering',
    kind: 'session',
    icon: 'mountain-snow',
    fields: [
      { key: 'sends', label: 'Sends', type: 'number' },
      { key: 'attempts', label: 'Attempts', type: 'number' },
      { key: 'maxGrade', label: 'Hardest grade', type: 'text' },
    ],
  },
  {
    key: 'yoga',
    name: 'Yoga / mobility',
    kind: 'session',
    icon: 'flower',
    fields: [],
  },
];

export function findPreset(key: string): ActivityPreset | undefined {
  return activityPresets.find((preset) => preset.key === key);
}
