import { randomUUID } from 'expo-crypto';

/** Client-made record ids keep offline writes idempotent. */
export const newId = (): string => randomUUID();
