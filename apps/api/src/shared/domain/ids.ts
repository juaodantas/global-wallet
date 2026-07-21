import { z } from 'zod';

export type UserId = string & { readonly __brand: 'UserId' };

export const uuidSchema = z.string().uuid();
export const userIdSchema = uuidSchema.transform((value) => value as UserId);

export function toUserId(value: string): UserId {
  return userIdSchema.parse(value);
}

export function tryUserId(value: string): UserId | null {
  const parsed = userIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
