import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  FRANKFURTER_BASE_URL: z.string().url().refine((value) => new URL(value).protocol === 'https:', 'Frankfurter base URL must use HTTPS').default('https://api.frankfurter.app'),
  FRANKFURTER_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  FRANKFURTER_CACHE_TTL_MS: z.coerce.number().int().positive().default(300000),
  FRANKFURTER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  FRANKFURTER_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60)
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
