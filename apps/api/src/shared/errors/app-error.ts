import type { ErrorCode } from '@global-wallet/contracts';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(params: { code: ErrorCode; message: string; statusCode: number; details?: Record<string, unknown> }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;
  }
}

export const validationError = (details?: Record<string, unknown>) =>
  new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid request', statusCode: 400, ...(details ? { details } : {}) });
