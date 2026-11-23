import type { ActivityPreset } from '@vigortally/core';
import type {
  ActivitySession,
  ActivitySessionInput,
  ActivityTypeInput,
  ActivityTypeSummary,
  ChangePasswordInput,
  CreateUserInput,
  Exercise,
  ExerciseInput,
  LoginInput,
  PreviousSets,
  Profile,
  ProfileInput,
  SetupInput,
  SetupStatus,
  Template,
  TemplateInput,
  User,
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
