import type { Prisma } from '@prisma/client';
import type { FinancialOperationId, UserId, WalletId } from '../../../shared/domain/ids.js';
import type { FinancialOperationType, IdempotencyScope, LedgerEntryInstruction, LedgerOperationResult } from '../domain/types.js';

export type LedgerTransaction = Prisma.TransactionClient;

export type LedgerMutationEntry = LedgerEntryInstruction & {
  allowNegativeBalance: boolean;
};

export type LedgerRepositoryPostingRequest = {
  actorUserId: UserId;
  primaryWalletId: WalletId;
  type: FinancialOperationType;
  correlationId?: string;
  idempotency: IdempotencyScope;
  originalOperationId?: FinancialOperationId;
  entries: readonly LedgerMutationEntry[];
};

export type LedgerRepositoryAtomicPostingRequest = Omit<LedgerRepositoryPostingRequest, 'idempotency'> & {
  idempotencyRecordId?: string;
};

export type LedgerReconciliationDifference = {
  walletId: string;
  currency: string;
  materializedAmountMinor: number;
  ledgerAmountMinor: number;
};

export interface LedgerRepository {
  post(request: LedgerRepositoryPostingRequest): Promise<LedgerOperationResult>;
  postInTransaction(transaction: LedgerTransaction, request: LedgerRepositoryAtomicPostingRequest): Promise<LedgerOperationResult>;
  reconcile(): Promise<LedgerReconciliationDifference[]>;
}
