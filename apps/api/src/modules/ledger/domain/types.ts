import { z } from 'zod';
import { currencySchema, type Currency } from '@global-wallet/contracts';
import { financialOperationIdSchema, uuidSchema, walletIdSchema, type FinancialOperationId, type UserId, type WalletId } from '../../../shared/domain/ids.js';

export type LedgerCurrency = Currency;
export type FinancialOperationType = 'DEPOSIT' | 'TRANSFER' | 'EXCHANGE_CONVERSION' | 'REVERSAL';
export type NormalFinancialOperationType = Exclude<FinancialOperationType, 'REVERSAL'>;
export type FinancialOperationStatus = 'COMPLETED' | 'REVERSED';
export type LedgerEntryDirection = 'DEBIT' | 'CREDIT';
export type PositiveMinorAmount = number & { readonly __brand: 'PositiveMinorAmount' };

export const financialOperationTypeSchema = z.enum(['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION', 'REVERSAL']);
export const normalFinancialOperationTypeSchema = z.enum(['DEPOSIT', 'TRANSFER', 'EXCHANGE_CONVERSION']);
export const financialOperationStatusSchema = z.enum(['COMPLETED', 'REVERSED']);
export const ledgerEntryDirectionSchema = z.enum(['DEBIT', 'CREDIT']);
export const positiveMinorAmountSchema = z.number().int().positive().refine(Number.isSafeInteger).transform((value) => value as PositiveMinorAmount);

export const idempotencyScopeSchema = z.object({
  endpoint: z.string().min(1),
  key: z.string().min(1),
  payloadHash: z.string().min(1)
});

export const ledgerEntryInstructionSchema = z.object({
  walletId: walletIdSchema,
  currency: currencySchema,
  direction: ledgerEntryDirectionSchema,
  amountMinor: positiveMinorAmountSchema
});

export const affectedBalanceSnapshotSchema = z.object({
  walletId: walletIdSchema,
  currency: currencySchema,
  balanceAfterMinor: z.number().int().refine(Number.isSafeInteger)
});

export const ledgerOperationResultSchema = z.object({
  operationId: financialOperationIdSchema,
  status: financialOperationStatusSchema,
  createdAt: z.string().datetime(),
  affectedBalances: z.array(affectedBalanceSnapshotSchema)
});

export type IdempotencyScope = z.infer<typeof idempotencyScopeSchema>;
export type LedgerEntryInstruction = z.infer<typeof ledgerEntryInstructionSchema>;
export type AffectedBalanceSnapshot = z.infer<typeof affectedBalanceSnapshotSchema>;
export type LedgerOperationResult = z.infer<typeof ledgerOperationResultSchema>;

export type NormalLedgerPostingRequest = {
  actorUserId: UserId;
  primaryWalletId: WalletId;
  type: NormalFinancialOperationType;
  correlationId?: string;
  idempotency: IdempotencyScope;
  entries: readonly LedgerEntryInstruction[];
};

export type ReversalLedgerPostingRequest = {
  actorUserId: UserId;
  primaryWalletId: WalletId;
  originalOperationId: FinancialOperationId;
  correlationId?: string;
  idempotency: IdempotencyScope;
  entries: readonly LedgerEntryInstruction[];
};

export function toPositiveMinorAmount(value: number): PositiveMinorAmount {
  return positiveMinorAmountSchema.parse(value);
}

export function parseCorrelationId(value: string): string {
  return uuidSchema.parse(value);
}
