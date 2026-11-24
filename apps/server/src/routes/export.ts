import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { publicUser } from '../auth/sessions';
import type { AppEnv } from '../context';
import {
  activitySessions,
  activityTypes,
  dashboardWidgets,
  diaryEntries,
  exercises,
  foods,
  mealPlanEntries,
  purchases,
  recipes,
  shoppingExtras,
  waterEntries,
  weighIns,
  workoutTemplates,
  workouts,
} from '../db/schema';
import { SERVER_VERSION } from '../meta';

/** Version of the export file format. */
export const EXPORT_FORMAT = 1;

/**
 * Everything belonging to the signed-in user, plus what their household shares (foods,
 * recipes, meal plan, shopping), as one JSON document. Secrets are never included.
 */
export function exportRoutes() {
  const app = new Hono<AppEnv>();

  app.get('/export', async (c) => {
    const db = c.var.db;
    const userId = c.var.user.id;
    const householdId = c.var.user.householdId;
    const own = <T extends { userId: unknown }>(table: T) => eq(table.userId as never, userId);
    const shared = <T extends { householdId: unknown }>(table: T) =>
      eq(table.householdId as never, householdId);

    const [
      activityTypeRows,
      sessionRows,
      exerciseRows,
      templateRows,
      workoutRows,
      diaryRows,
      waterRows,
      weighInRows,
      widgetRows,
      foodRows,
      recipeRows,
      planRows,
      purchaseRows,
      extraRows,
    ] = await Promise.all([
      db.select().from(activityTypes).where(own(activityTypes)),
      db.select().from(activitySessions).where(own(activitySessions)),
      db.select().from(exercises).where(own(exercises)),
      db.select().from(workoutTemplates).where(own(workoutTemplates)),
      db.select().from(workouts).where(own(workouts)),
      db.select().from(diaryEntries).where(own(diaryEntries)),
      db.select().from(waterEntries).where(own(waterEntries)),
      db.select().from(weighIns).where(own(weighIns)),
      db.select().from(dashboardWidgets).where(own(dashboardWidgets)),
      db.select().from(foods).where(shared(foods)),
      db.select().from(recipes).where(shared(recipes)),
      db.select().from(mealPlanEntries).where(shared(mealPlanEntries)),
      db.select().from(purchases).where(shared(purchases)),
      db.select().from(shoppingExtras).where(shared(shoppingExtras)),
    ]);

    // Drop internal ownership columns; they only mean something on this server.
    const strip = <T extends Record<string, unknown>>(rows: T[]) =>
      rows.map(({ userId: _u, householdId: _h, createdBy: _c, ...rest }) => rest);

    const date = c.var.deps.now().toISOString().slice(0, 10);
    c.header('content-disposition', `attachment; filename="vigortally-export-${date}.json"`);
    return c.json({
      format: EXPORT_FORMAT,
      exportedAt: c.var.deps.now().toISOString(),
      serverVersion: SERVER_VERSION,
      user: publicUser(c.var.user),
      profile: c.var.user.profile,
      activities: {
        types: strip(activityTypeRows),
        sessions: strip(sessionRows),
        customExercises: strip(exerciseRows),
        templates: strip(templateRows),
        workouts: strip(workoutRows),
      },
      nutrition: {
        diary: strip(diaryRows),
        water: strip(waterRows),
        weighIns: strip(weighInRows),
      },
      household: {
        foods: strip(foodRows),
        recipes: strip(recipeRows),
        mealPlan: strip(planRows),
        purchases: strip(purchaseRows),
        shoppingExtras: strip(extraRows),
      },
      dashboard: strip(widgetRows),
    });
  });

  return app;
}
