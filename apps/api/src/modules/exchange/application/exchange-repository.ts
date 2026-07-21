import type { Currency } from '@prisma/client';
import type { Decimal, InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
import type { UserId } from '../../../shared/domain/ids.js';
import type { LedgerTransaction } from '../../ledger/application/ledger-repository.js';

export type ExchangeRateInput = { provider: string; baseCurrency: Currency; quoteCurrency: Currency; rate: string; fetchedAt: Date; rawPayloadHash?: string };
export type QuoteRecord = { id: string; walletId: string; sourceCurrency: Currency; targetCurrency: Currency; sourceAmountMinor: bigint; targetAmountMinor: bigint; rate: Decimal; status: 'ACTIVE' | 'USED' | 'EXPIRED'; expiresAt: Date; createdAt: Date; rateSnapshot: { provider: string; fetchedAt: Date } };
export type ConversionRecord = { id: string; quoteId: string; sourceCurrency: Currency; targetCurrency: Currency; sourceAmountMinor: bigint; targetAmountMinor: bigint; rate: Decimal; createdAt: Date; quote: { rateSnapshot: { provider: string } }; operation: { id: string; type: 'DEPOSIT' | 'TRANSFER' | 'EXCHANGE_CONVERSION' | 'REVERSAL'; status: 'COMPLETED' | 'REVERSED'; createdAt: Date } };
export type ExchangeIdempotencyRecord = { id: string; payloadHash: string; storedResponse: JsonValue | null };

export interface ExchangeRepository {
  runInTransaction<T>(handler: (transaction: LedgerTransaction) => Promise<T>): Promise<T>;
  lockIdempotencyScope(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<void>;
  findIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<ExchangeIdempotencyRecord | null>;
  createIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string; payloadHash: string }): Promise<ExchangeIdempotencyRecord>;
  storeIdempotencyResponse(transaction: LedgerTransaction, input: { id: string; storedResponse: InputJsonValue }): Promise<void>;
  findWalletIdByUser(userId: UserId): Promise<string | null>;
  createQuote(input: { userId: UserId; walletId: string; sourceCurrency: Currency; targetCurrency: Currency; sourceAmountMinor: number; targetAmountMinor: number; rate: ExchangeRateInput; expiresAt: Date }): Promise<QuoteRecord>;
  findQuote(transaction: LedgerTransaction, input: { userId: UserId; quoteId: string }): Promise<QuoteRecord | null>;
  claimActiveQuote(transaction: LedgerTransaction, input: { userId: UserId; quoteId: string; usedAt: Date }): Promise<boolean>;
  expireActiveQuote(input: { userId: UserId; quoteId: string; now: Date }): Promise<void>;
  createConversion(transaction: LedgerTransaction, input: { quote: QuoteRecord; userId: UserId; operationId: string }): Promise<ConversionRecord>;
  setOperationCorrelationId(transaction: LedgerTransaction, input: { operationId: string; correlationId: string }): Promise<void>;
}
