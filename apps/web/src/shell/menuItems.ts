import { Download, Plug, Settings, Smartphone, Target, Users, type LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Entries of the side menu, in display order. */
export const menuItems: readonly MenuItem[] = [
  {
    id: 'profile',
    label: 'Profile & goals',
    description: 'Targets, units, training days',
    icon: Target,
  },
  { id: 'settings', label: 'Settings', description: 'Theme, notifications', icon: Settings },
  { id: 'household', label: 'Household', description: 'Shared recipes and lists', icon: Users },
  {
    id: 'devices',
    label: 'Connected devices',
    description: 'Pair the companion app',
    icon: Smartphone,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Strava, Health Connect, imports',
    icon: Plug,
  },
  { id: 'data', label: 'Export & server', description: 'Your data, server info', icon: Download },
];
