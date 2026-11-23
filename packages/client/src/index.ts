import type {
  ChangePasswordInput,
  CreateUserInput,
  LoginInput,
  Profile,
  ProfileInput,
  SetupInput,
  SetupStatus,
  User,
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
