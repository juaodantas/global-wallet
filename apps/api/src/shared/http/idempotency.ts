import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';

const idempotencyKeySchema = z.string().trim().min(1).max(255);

export function parseIdempotencyKey(request: FastifyRequest): string {
  const value = request.headers['idempotency-key'];
  if (Array.isArray(value)) throw invalidIdempotencyKey();
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) throw invalidIdempotencyKey();
  return parsed.data;
}

function invalidIdempotencyKey(): AppError {
  return new AppError({ code: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required', statusCode: 400 });
}
