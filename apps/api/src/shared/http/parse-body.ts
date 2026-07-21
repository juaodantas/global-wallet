import type { z } from 'zod';

export function parseBody<TSchema extends z.ZodType>(schema: TSchema, body: unknown): z.output<TSchema> {
  return schema.parse(body);
}
