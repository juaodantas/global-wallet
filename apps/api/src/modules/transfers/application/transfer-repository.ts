import type { Currency } from '@prisma/client';
import type { InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
import type { UserId } from '../../../shared/domain/ids.js';
import type { LedgerTransaction } from '../../ledger/application/ledger-repository.js';

export type TransferRecord = {
  id: string;
  operationId: string;
  senderWalletId: string;
  recipientWalletId: string;
  recipientEmail: string;
  currency: Currency;
  amountMinor: bigint;
  createdAt: Date;
  operation: { id: string; type: 'DEPOSIT' | 'TRANSFER' | 'EXCHANGE_CONVERSION' | 'REVERSAL'; status: 'COMPLETED' | 'REVERSED'; createdAt: Date };
};

export type TransferParticipantRecord = {
  senderWalletId: string;
  recipientUserId: string;
  recipientWalletId: string;
  recipientEmail: string;
};

export type TransferIdempotencyRecord = { id: string; payloadHash: string; storedResponse: JsonValue | null };

export interface TransferRepository {
  runInTransaction<T>(handler: (transaction: LedgerTransaction) => Promise<T>): Promise<T>;
  lockIdempotencyScope(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<void>;
  findIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<TransferIdempotencyRecord | null>;
  createIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string; payloadHash: string }): Promise<TransferIdempotencyRecord>;
  storeIdempotencyResponse(transaction: LedgerTransaction, input: { id: string; storedResponse: InputJsonValue }): Promise<void>;
  findParticipants(transaction: LedgerTransaction, input: { userId: UserId; recipientEmail: string }): Promise<TransferParticipantRecord | null>;
  createTransfer(transaction: LedgerTransaction, input: { operationId: string; senderWalletId: string; recipientWalletId: string; recipientEmail: string; currency: Currency; amountMinor: number }): Promise<TransferRecord>;
  setOperationCorrelationId(transaction: LedgerTransaction, input: { operationId: string; correlationId: string }): Promise<void>;
  findWalletIdByUser(userId: UserId): Promise<string | null>;
  listByWallet(walletId: string): Promise<TransferRecord[]>;
}
