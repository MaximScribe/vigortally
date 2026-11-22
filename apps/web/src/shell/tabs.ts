import { Activity, ChartColumn, Salad, type LucideIcon } from 'lucide-react';

export interface TabDefinition {
  to: '/nutrition' | '/activities' | '/statistics';
  label: string;
  icon: LucideIcon;
}

/** The three main tabs, in bottom-bar order. Activities sits in the middle. */
export const tabs: readonly TabDefinition[] = [
  { to: '/nutrition', label: 'Nutrition', icon: Salad },
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/statistics', label: 'Stats', icon: ChartColumn },
];

export const defaultTab: TabDefinition['to'] = '/activities';
