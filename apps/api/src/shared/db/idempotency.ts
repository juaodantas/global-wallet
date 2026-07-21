import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error.js';

export async function acquireIdempotencyScopeLock(transaction: Prisma.TransactionClient, input: { userId: string; endpoint: string; key: string }): Promise<void> {
  const scope = `${input.userId}:${input.endpoint}:${input.key}`;
  const lockKey = createHash('sha256').update(scope).digest().readBigInt64BE(0);
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
}

export function idempotencyConflictError(): AppError {
  return new AppError({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key already used with a different payload', statusCode: 409 });
}

export function missingStoredResponseError(): AppError {
  return new AppError({ code: 'INTERNAL_ERROR', message: 'Idempotency record is missing its stored response', statusCode: 500 });
}
