import { AppError } from '../../../shared/errors/app-error.js';
import type { LedgerRepository, LedgerTransaction } from './ledger-repository.js';
import type { LedgerOperationResult, NormalLedgerPostingRequest, ReversalLedgerPostingRequest } from '../domain/types.js';
import { idempotencyScopeSchema, ledgerEntryInstructionSchema, normalFinancialOperationTypeSchema, parseCorrelationId } from '../domain/types.js';

export class LedgerPostingService {
  constructor(private readonly repository: LedgerRepository) {}

  async post(request: NormalLedgerPostingRequest): Promise<LedgerOperationResult> {
    const entries = this.parseEntries(request.entries);
    const repositoryRequest = {
      actorUserId: request.actorUserId,
      primaryWalletId: request.primaryWalletId,
      type: normalFinancialOperationTypeSchema.parse(request.type),
      idempotency: idempotencyScopeSchema.parse(request.idempotency),
      entries: entries.map((entry) => ({ ...entry, allowNegativeBalance: false }))
    };
    return this.repository.post(request.correlationId ? { ...repositoryRequest, correlationId: parseCorrelationId(request.correlationId) } : repositoryRequest);
  }

  async postReversal(request: ReversalLedgerPostingRequest): Promise<LedgerOperationResult> {
    const entries = this.parseEntries(request.entries);
    const repositoryRequest = {
      actorUserId: request.actorUserId,
      primaryWalletId: request.primaryWalletId,
      type: 'REVERSAL',
      originalOperationId: request.originalOperationId,
      idempotency: idempotencyScopeSchema.parse(request.idempotency),
      entries: entries.map((entry) => ({ ...entry, allowNegativeBalance: entry.direction === 'DEBIT' }))
    } as const;
    return this.repository.post(request.correlationId ? { ...repositoryRequest, correlationId: parseCorrelationId(request.correlationId) } : repositoryRequest);
  }

  async postInTransaction(transaction: LedgerTransaction, request: NormalLedgerPostingRequest & { idempotencyRecordId?: string }): Promise<LedgerOperationResult> {
    const entries = this.parseEntries(request.entries);
    const repositoryRequest = {
      actorUserId: request.actorUserId,
      primaryWalletId: request.primaryWalletId,
      type: normalFinancialOperationTypeSchema.parse(request.type),
      ...(request.idempotencyRecordId ? { idempotencyRecordId: request.idempotencyRecordId } : {}),
      entries: entries.map((entry) => ({ ...entry, allowNegativeBalance: false }))
    };
    return this.repository.postInTransaction(transaction, request.correlationId ? { ...repositoryRequest, correlationId: parseCorrelationId(request.correlationId) } : repositoryRequest);
  }

  async postReversalInTransaction(transaction: LedgerTransaction, request: Omit<ReversalLedgerPostingRequest, 'idempotency'> & { idempotencyRecordId?: string }): Promise<LedgerOperationResult> {
    const entries = this.parseEntries(request.entries);
    const repositoryRequest = {
      actorUserId: request.actorUserId,
      primaryWalletId: request.primaryWalletId,
      type: 'REVERSAL' as const,
      originalOperationId: request.originalOperationId,
      ...(request.idempotencyRecordId ? { idempotencyRecordId: request.idempotencyRecordId } : {}),
      entries: entries.map((entry) => ({ ...entry, allowNegativeBalance: entry.direction === 'DEBIT' }))
    };
    return this.repository.postInTransaction(transaction, request.correlationId ? { ...repositoryRequest, correlationId: parseCorrelationId(request.correlationId) } : repositoryRequest);
  }

  private parseEntries(entries: readonly unknown[]) {
    if (entries.length === 0) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Ledger posting requires at least one entry', statusCode: 400 });
    }
    return entries.map((entry) => ledgerEntryInstructionSchema.parse(entry));
  }
}
