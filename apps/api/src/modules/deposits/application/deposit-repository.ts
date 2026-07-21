import type { Currency } from '@prisma/client';
import type { InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
import type { UserId } from '../../../shared/domain/ids.js';
import type { LedgerTransaction } from '../../ledger/application/ledger-repository.js';

export type DepositRecord = { id: string; walletId: string; operationId: string | null; currency: Currency; amountMinor: bigint; status: 'PENDING' | 'CONFIRMED' | 'FAILED'; gatewayReference: string | null; confirmedAt: Date | null; createdAt: Date };
export type DepositIdempotencyRecord = { id: string; payloadHash: string; storedResponse: JsonValue | null };

export interface DepositRepository {
  runInTransaction<T>(handler: (transaction: LedgerTransaction) => Promise<T>): Promise<T>;
  lockIdempotencyScope(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<void>;
  findIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<DepositIdempotencyRecord | null>;
  createIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string; payloadHash: string; storedResponse?: InputJsonValue }): Promise<DepositIdempotencyRecord>;
  storeIdempotencyResponse(transaction: LedgerTransaction, input: { id: string; storedResponse: InputJsonValue }): Promise<void>;
  findWalletIdByUser(transaction: LedgerTransaction, userId: UserId): Promise<string | null>;
  createPendingDeposit(transaction: LedgerTransaction, input: { userId: UserId; walletId: string; amountMinor: number; gatewayReference: string }): Promise<DepositRecord>;
  findDeposit(transaction: LedgerTransaction, input: { userId: UserId; depositId: string }): Promise<DepositRecord | null>;
  claimPendingDeposit(transaction: LedgerTransaction, input: { userId: UserId; depositId: string; confirmedAt: Date }): Promise<boolean>;
  attachOperation(transaction: LedgerTransaction, input: { depositId: string; operationId: string }): Promise<DepositRecord>;
  listByUser(userId: UserId): Promise<DepositRecord[]>;
}
