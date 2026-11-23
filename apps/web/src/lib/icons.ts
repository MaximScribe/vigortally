import {
  Activity,
  Bike,
  Dumbbell,
  Flower2,
  Footprints,
  Mountain,
  MountainSnow,
  Snowflake,
  Waves,
  type LucideIcon,
} from 'lucide-react';

/** Icon names stored with activities, mapped to icons. Unknown names fall back. */
const icons: Record<string, LucideIcon> = {
  activity: Activity,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  waves: Waves,
  mountain: Mountain,
  'mountain-snow': MountainSnow,
  snowflake: Snowflake,
  flower: Flower2,
};

export const iconNames = Object.keys(icons);

export function activityIcon(name: string | null | undefined): LucideIcon {
  return icons[name ?? ''] ?? Activity;
}
