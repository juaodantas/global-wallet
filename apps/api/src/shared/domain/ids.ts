import { z } from 'zod';

export type UserId = string & { readonly __brand: 'UserId' };
export type WalletId = string & { readonly __brand: 'WalletId' };
export type FinancialOperationId = string & { readonly __brand: 'FinancialOperationId' };
export type OperationId = FinancialOperationId;
export type LedgerEntryId = string & { readonly __brand: 'LedgerEntryId' };
export type IdempotencyRecordId = string & { readonly __brand: 'IdempotencyRecordId' };

export const uuidSchema = z.string().uuid();
export const userIdSchema = uuidSchema.transform((value) => value as UserId);
export const walletIdSchema = uuidSchema.transform((value) => value as WalletId);
export const financialOperationIdSchema = uuidSchema.transform((value) => value as FinancialOperationId);
export const ledgerEntryIdSchema = uuidSchema.transform((value) => value as LedgerEntryId);
export const idempotencyRecordIdSchema = uuidSchema.transform((value) => value as IdempotencyRecordId);

export function toUserId(value: string): UserId {
  return userIdSchema.parse(value);
}

export function tryUserId(value: string): UserId | null {
  const parsed = userIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toWalletId(value: string): WalletId {
  return walletIdSchema.parse(value);
}

export function toFinancialOperationId(value: string): FinancialOperationId {
  return financialOperationIdSchema.parse(value);
}

export function toLedgerEntryId(value: string): LedgerEntryId {
  return ledgerEntryIdSchema.parse(value);
}

export function toIdempotencyRecordId(value: string): IdempotencyRecordId {
  return idempotencyRecordIdSchema.parse(value);
}
