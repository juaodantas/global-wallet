import { AppError } from '../errors/app-error.js';

export function bigintToSafeNumber(value: bigint): number {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue)) throw new AppError({ code: 'INTERNAL_ERROR', message: 'Amount is outside supported range', statusCode: 500 });
  return numberValue;
}
