import { Download, Plug, Smartphone, Target, Users, type LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Page the item opens. Items without one are not available yet. */
  to?: string;
}

/** Entries of the side menu, in display order. */
export const menuItems: readonly MenuItem[] = [
  {
    id: 'profile',
    label: 'Profile & goals',
    description: 'Targets, units, password',
    icon: Target,
    to: '/settings/profile',
  },
  {
    id: 'household',
    label: 'Household',
    description: 'Members sharing recipes and lists',
    icon: Users,
    to: '/settings/household',
  },
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
