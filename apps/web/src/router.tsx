import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { NutritionPage } from './pages/NutritionPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { AppShell } from './shell/AppShell';
import { defaultTab } from './shell/tabs';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: defaultTab });
  },
});

const nutritionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nutrition',
  component: NutritionPage,
});

const activitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activities',
  component: ActivitiesPage,
});

const statisticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/statistics',
  component: StatisticsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  nutritionRoute,
  activitiesRoute,
  statisticsRoute,
]);

export function createAppRouter(history: RouterHistory = createBrowserHistory()) {
  return createRouter({ routeTree, history, defaultPreload: 'intent' });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
