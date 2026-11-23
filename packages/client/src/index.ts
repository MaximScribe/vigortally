import type { ActivityPreset } from '@vigortally/core';
import type {
  ActivitySession,
  ActivitySessionInput,
  ActivityTypeInput,
  ActivityTypeSummary,
  ChangePasswordInput,
  CreateUserInput,
  DayNutrition,
  Device,
  DiaryEntry,
  DiaryEntryInput,
  Exercise,
  ExerciseInput,
  Food,
  FoodInput,
  LoginInput,
  MealPlanEntry,
  MealPlanEntryInput,
  PurchaseInput,
  Recipe,
  RecipeInput,
  ShoppingExtra,
  ShoppingExtraInput,
  ShoppingList,
  PairInput,
  PairingCode,
  PairResult,
  PreviousSets,
  Profile,
  ProfileInput,
  Series,
  SeriesQuery,
  SetupInput,
  SetupStatus,
  Template,
  TemplateInput,
  User,
  WaterEntryInput,
  WeighIn,
  WeighInInput,
  Widget,
  WidgetInput,
  Workout,
  WorkoutInput,
} from '@vigortally/schema';
import { createRequester, type HttpOptions } from './http';

export { ApiRequestError, type HttpOptions } from './http';

export interface ServerInfo {
  name: string;
  version: string;
  apiVersion: number;
  features: string[];
}

export interface Me {
  user: User;
  profile: Profile;
}

/** Typed wrapper around every API endpoint. */
export function createApiClient(options: HttpOptions) {
  const request = createRequester(options);

  return {
    request,

    server: {
      info: () => request<ServerInfo>('GET', '/info'),
      health: () => request<{ status: string; database: string }>('GET', '/health'),
    },

    auth: {
      setupStatus: () => request<SetupStatus>('GET', '/setup'),
      setup: (input: SetupInput) => request<User>('POST', '/setup', input),
      login: (input: LoginInput) => request<User>('POST', '/auth/login', input),
      logout: () => request<null>('POST', '/auth/logout'),
    },

    me: {
      get: () => request<Me>('GET', '/me'),
      updateProfile: (input: ProfileInput) => request<Profile>('PATCH', '/me/profile', input),
      changePassword: (input: ChangePasswordInput) => request<null>('POST', '/me/password', input),
    },

    users: {
      list: () => request<User[]>('GET', '/users'),
      create: (input: CreateUserInput) => request<User>('POST', '/users', input),
      remove: (id: string) => request<null>('DELETE', `/users/${id}`),
    },

    activities: {
      presets: () => request<ActivityPreset[]>('GET', '/activity-presets'),
      list: () => request<ActivityTypeSummary[]>('GET', '/activity-types'),
      save: (input: ActivityTypeInput) =>
        request<ActivityTypeInput>('PUT', `/activity-types/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/activity-types/${id}`),
    },

    sessions: {
      list: (query: { activityTypeId?: string; from?: string; to?: string; limit?: number } = {}) =>
        request<ActivitySession[]>('GET', '/activity-sessions', undefined, query),
      save: (input: ActivitySessionInput) =>
        request<ActivitySession>('PUT', `/activity-sessions/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/activity-sessions/${id}`),
    },

    exercises: {
      list: () => request<Exercise[]>('GET', '/exercises'),
      save: (input: ExerciseInput) => request<Exercise>('PUT', `/exercises/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/exercises/${id}`),
    },

    templates: {
      list: () => request<Template[]>('GET', '/templates'),
      save: (input: TemplateInput) =>
        request<TemplateInput>('PUT', `/templates/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/templates/${id}`),
    },

    workouts: {
      list: (query: { before?: string; limit?: number } = {}) =>
        request<Workout[]>('GET', '/workouts', undefined, query),
      get: (id: string) => request<Workout>('GET', `/workouts/${id}`),
      previous: (exerciseIds: readonly string[]) =>
        request<PreviousSets>('GET', '/workouts/previous', undefined, {
          exerciseIds: exerciseIds.join(','),
        }),
      save: (input: WorkoutInput) => request<Workout>('PUT', `/workouts/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/workouts/${id}`),
    },

    foods: {
      search: (q = '', limit = 30) => request<Food[]>('GET', '/foods', undefined, { q, limit }),
      recent: () => request<Food[]>('GET', '/foods/recent'),
      barcode: (code: string) => request<Food>('GET', `/foods/barcode/${encodeURIComponent(code)}`),
      save: (input: FoodInput) => request<Food>('PUT', `/foods/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/foods/${id}`),
    },

    diary: {
      day: (date: string) => request<DayNutrition>('GET', '/diary', undefined, { date }),
      save: (input: DiaryEntryInput) => request<DiaryEntry>('PUT', `/diary/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/diary/${id}`),
      addWater: (input: WaterEntryInput) =>
        request<DayNutrition>('PUT', `/water/${input.id}`, input),
    },

    weighIns: {
      list: (query: { from?: string; to?: string } = {}) =>
        request<WeighIn[]>('GET', '/weigh-ins', undefined, query),
      save: (input: WeighInInput) => request<WeighIn>('PUT', `/weigh-ins/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/weigh-ins/${id}`),
    },

    recipes: {
      list: () => request<Recipe[]>('GET', '/recipes'),
      get: (id: string) => request<Recipe>('GET', `/recipes/${id}`),
      save: (input: RecipeInput) => request<Recipe>('PUT', `/recipes/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/recipes/${id}`),
      /** Reads a recipe from a web page; returns an unsaved draft. */
      import: (url: string) => request<RecipeInput>('POST', '/recipes/import', { url }),
    },

    mealPlan: {
      list: (from: string, to: string) =>
        request<MealPlanEntry[]>('GET', '/meal-plan', undefined, { from, to }),
      save: (input: MealPlanEntryInput) =>
        request<MealPlanEntry>('PUT', `/meal-plan/${input.id}`, input),
      remove: (id: string) => request<null>('DELETE', `/meal-plan/${id}`),
    },

    shopping: {
      list: (today?: string) =>
        request<ShoppingList>('GET', '/shopping-list', undefined, { today }),
      purchase: (input: PurchaseInput) =>
        request<PurchaseInput>('PUT', `/purchases/${input.id}`, input),
      undoPurchase: (id: string) => request<null>('DELETE', `/purchases/${id}`),
      saveExtra: (input: ShoppingExtraInput) =>
        request<ShoppingExtra>('PUT', `/shopping-extras/${input.id}`, input),
      removeExtra: (id: string) => request<null>('DELETE', `/shopping-extras/${id}`),
      clearDoneExtras: () => request<null>('DELETE', '/shopping-extras'),
    },

    devices: {
      list: () => request<Device[]>('GET', '/devices'),
      createPairingCode: () => request<PairingCode>('POST', '/devices/pairing'),
      /** Used by the companion app (no session yet): trade a code for a device token. */
      pair: (input: PairInput) => request<PairResult>('POST', '/devices/pair', input),
      revoke: (id: string) => request<null>('DELETE', `/devices/${id}`),
    },

    stats: {
      series: (query: SeriesQuery & { tzOffset?: number }) =>
        request<Series>('GET', '/stats/series', undefined, {
          ...query,
          tzOffset: query.tzOffset ?? -new Date().getTimezoneOffset(),
        }),
    },

    dashboard: {
      list: () => request<Widget[]>('GET', '/dashboard'),
      save: (input: WidgetInput) => request<Widget>('PUT', `/dashboard/widgets/${input.id}`, input),
      reorder: (ids: string[]) => request<Widget[]>('PUT', '/dashboard/order', { ids }),
      remove: (id: string) => request<null>('DELETE', `/dashboard/widgets/${id}`),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
