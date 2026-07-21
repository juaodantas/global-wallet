import { errorResponseSchema } from '@global-wallet/contracts';

export async function readApiError(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null);
  const parsed = errorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error.message : fallback;
}

export function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
