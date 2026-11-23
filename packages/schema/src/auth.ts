import { z } from 'zod';
import { id } from './common';

export const role = z.enum(['admin', 'member']);
export type Role = z.infer<typeof role>;

export const unitSystem = z.enum(['metric', 'imperial']);
export type UnitSystem = z.infer<typeof unitSystem>;

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(8, 'Use at least 8 characters').max(200);
const name = z.string().trim().min(1).max(80);

export const user = z.object({
  id,
  name,
  email: z.string(),
  role,
  householdId: id,
});
export type User = z.infer<typeof user>;

/** First-run setup: creates the server's admin account and household. */
export const setupInput = z.object({
  name,
  email,
  password,
  householdName: z.string().trim().min(1).max(80).default('Home'),
});
export type SetupInput = z.input<typeof setupInput>;

export const loginInput = z.object({
  email,
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginInput>;

/** Admin creates another account in the same household. */
export const createUserInput = z.object({
  name,
  email,
  password,
  role: role.default('member'),
});
export type CreateUserInput = z.input<typeof createUserInput>;

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

export const setupStatus = z.object({ setupRequired: z.boolean() });
export type SetupStatus = z.infer<typeof setupStatus>;

/** Personal settings stored with the user. */
export const profile = z.object({
  units: unitSystem.default('metric'),
  /** 0 = Sunday … 6 = Saturday. The shopping list plans up to this day. */
  shoppingDay: z.number().int().min(0).max(6).default(6),
  targets: z
    .object({
      kcal: z.number().int().min(0).max(10000).default(2200),
      protein: z.number().min(0).max(1000).default(140),
      carbs: z.number().min(0).max(2000).default(250),
      fat: z.number().min(0).max(1000).default(70),
      waterMl: z.number().int().min(0).max(10000).default(2500),
    })
    .prefault({}),
});
export type Profile = z.infer<typeof profile>;
export const profileInput = profile.partial();
export type ProfileInput = z.input<typeof profileInput>;

export const device = z.object({
  id,
  name: z.string(),
  /** `web` for browser sessions, `device` for paired companion apps. */
  kind: z.enum(['web', 'device']),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  current: z.boolean(),
});
export type Device = z.infer<typeof device>;

export const pairingCode = z.object({
  code: z.string(),
  expiresAt: z.string(),
  /** Deep link encoded in the QR code. */
  link: z.string(),
  serverUrl: z.string(),
});
export type PairingCode = z.infer<typeof pairingCode>;

export const pairInput = z.object({
  code: z.string().trim().min(6).max(32),
  deviceName: z.string().trim().min(1).max(80),
});
export type PairInput = z.infer<typeof pairInput>;

export const pairResult = z.object({ token: z.string(), user });
export type PairResult = z.infer<typeof pairResult>;
