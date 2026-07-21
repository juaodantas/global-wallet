import { AppError } from '../../../shared/errors/app-error.js';

export const insufficientFundsError = () =>
  new AppError({ code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds', statusCode: 409 });

export const idempotencyConflictError = () =>
  new AppError({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key already used with a different payload', statusCode: 409 });
