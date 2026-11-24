import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  type RouteComponent,
  type RouterHistory,
} from '@tanstack/react-router';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { NutritionPage } from './pages/NutritionPage';
import { AppShell } from './shell/AppShell';
import { defaultTab } from './shell/tabs';

const rootRoute = createRootRoute({ component: AppShell });

function page<P extends string>(path: P, component: RouteComponent) {
  return createRoute({ getParentRoute: () => rootRoute, path, component });
}

// The two everyday tabs load with the app; everything else is fetched on first use.
const lazy = {
  recipeEditor: lazyRouteComponent(() => import('./kitchen/RecipeEditorPage'), 'RecipeEditorPage'),
  activityDetail: lazyRouteComponent(
    () => import('./pages/activities/ActivityDetailPage'),
    'ActivityDetailPage',
  ),
  statistics: lazyRouteComponent(() => import('./pages/StatisticsPage'), 'StatisticsPage'),
  workout: lazyRouteComponent(() => import('./workout/WorkoutPage'), 'WorkoutPage'),
  templateEditor: lazyRouteComponent(
    () => import('./workout/TemplateEditorPage'),
    'TemplateEditorPage',
  ),
  profile: lazyRouteComponent(() => import('./pages/settings/ProfilePage'), 'ProfilePage'),
  household: lazyRouteComponent(() => import('./pages/settings/HouseholdPage'), 'HouseholdPage'),
  devices: lazyRouteComponent(() => import('./pages/settings/DevicesPage'), 'DevicesPage'),
  data: lazyRouteComponent(() => import('./pages/settings/DataPage'), 'DataPage'),
};

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: defaultTab });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  page('/nutrition', NutritionPage),
  page('/kitchen/recipes/$recipeId', lazy.recipeEditor),
  page('/activities', ActivitiesPage),
  page('/activities/$activityId', lazy.activityDetail),
  page('/statistics', lazy.statistics),
  page('/workout', lazy.workout),
  page('/templates/$templateId', lazy.templateEditor),
  page('/settings/profile', lazy.profile),
  page('/settings/household', lazy.household),
  page('/settings/devices', lazy.devices),
  page('/settings/data', lazy.data),
]);

export function createAppRouter(history: RouterHistory = createBrowserHistory()) {
  return createRouter({ routeTree, history, defaultPreload: 'intent' });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
