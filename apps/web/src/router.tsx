import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ActivityDetailPage } from './pages/activities/ActivityDetailPage';
import { NutritionPage } from './pages/NutritionPage';
import { HouseholdPage } from './pages/settings/HouseholdPage';
import { ProfilePage } from './pages/settings/ProfilePage';
import { StatisticsPage } from './pages/StatisticsPage';
import { AppShell } from './shell/AppShell';
import { defaultTab } from './shell/tabs';

const rootRoute = createRootRoute({ component: AppShell });

function page<P extends string>(path: P, component: () => React.ReactNode) {
  return createRoute({ getParentRoute: () => rootRoute, path, component });
}

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
  page('/activities', ActivitiesPage),
  page('/activities/$activityId', ActivityDetailPage),
  page('/statistics', StatisticsPage),
  page('/settings/profile', ProfilePage),
  page('/settings/household', HouseholdPage),
]);

export function createAppRouter(history: RouterHistory = createBrowserHistory()) {
  return createRouter({ routeTree, history, defaultPreload: 'intent' });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
