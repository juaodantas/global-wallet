import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error.js';
import { toFinancialOperationId } from '../../../shared/domain/ids.js';
import type { LedgerReconciliationDifference, LedgerRepository, LedgerRepositoryAtomicPostingRequest, LedgerRepositoryPostingRequest } from '../application/ledger-repository.js';
import { idempotencyConflictError, insufficientFundsError } from '../domain/errors.js';
import type { AffectedBalanceSnapshot, LedgerOperationResult } from '../domain/types.js';
import { ledgerOperationResultSchema } from '../domain/types.js';

type ReconciliationRow = {
  walletId: string;
  currency: string;
  materializedAmountMinor: bigint;
  ledgerAmountMinor: bigint;
};

type WalletBalanceRecord = {
  amountMinor: bigint;
};

function toSafeNumber(value: bigint): number {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue)) {
    throw new AppError({ code: 'INTERNAL_ERROR', message: 'Ledger amount is too large', statusCode: 500 });
  }
  return numberValue;
}

export class PrismaLedgerRepository implements LedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async post(request: LedgerRepositoryPostingRequest): Promise<LedgerOperationResult> {
    return this.prisma.$transaction(async (transaction) => {
      await this.acquireIdempotencyScopeLock(transaction, request);

      const existingRecord = await transaction.idempotencyRecord.findFirst({
        where: { userId: request.actorUserId, endpoint: request.idempotency.endpoint, key: request.idempotency.key }
      });

      if (existingRecord) {
        if (existingRecord.payloadHash !== request.idempotency.payloadHash) throw idempotencyConflictError();
        if (!existingRecord.storedResponse) {
          throw new AppError({ code: 'INTERNAL_ERROR', message: 'Idempotency record is missing its stored response after advisory lock acquisition', statusCode: 500 });
        }
        return ledgerOperationResultSchema.parse(existingRecord.storedResponse);
      }

      const result = await this.postInTransaction(transaction, request);

      const idempotencyRecord = await transaction.idempotencyRecord.create({
        data: {
          userId: request.actorUserId,
          endpoint: request.idempotency.endpoint,
          key: request.idempotency.key,
          payloadHash: request.idempotency.payloadHash,
          storedResponse: this.toStoredResponse(result)
        },
        select: { id: true }
      });

      await transaction.financialOperation.update({
        where: { id: result.operationId },
        data: { idempotencyRecordId: idempotencyRecord.id }
      });

      return result;
    });
  }

  async postInTransaction(transaction: Prisma.TransactionClient, request: LedgerRepositoryAtomicPostingRequest): Promise<LedgerOperationResult> {
    const operation = await transaction.financialOperation.create({
      data: {
        actorUserId: request.actorUserId,
        primaryWalletId: request.primaryWalletId,
        type: request.type,
        status: 'COMPLETED',
        ...(request.idempotencyRecordId ? { idempotencyRecordId: request.idempotencyRecordId } : {}),
        ...(request.correlationId ? { correlationId: request.correlationId } : {}),
        ...(request.originalOperationId ? { originalOperationId: request.originalOperationId } : {})
      }
    });

    const affectedBalances: AffectedBalanceSnapshot[] = [];
    for (const entry of request.entries) {
      const balance = await this.applyEntry(transaction, entry);
      await transaction.ledgerEntry.create({
        data: {
          operationId: operation.id,
          walletId: entry.walletId,
          currency: entry.currency,
          direction: entry.direction,
          amountMinor: BigInt(entry.amountMinor),
          balanceAfterMinor: balance.amountMinor
        }
      });
      affectedBalances.push({ walletId: entry.walletId, currency: entry.currency, balanceAfterMinor: toSafeNumber(balance.amountMinor) });
    }

    if (request.type === 'REVERSAL' && request.originalOperationId) {
      await transaction.financialOperation.update({
        where: { id: request.originalOperationId },
        data: { status: 'REVERSED', reversalOperationId: operation.id }
      });
    }

    return {
      operationId: toFinancialOperationId(operation.id),
      status: operation.status,
      createdAt: operation.createdAt.toISOString(),
      affectedBalances
    };
  }

  async reconcile(): Promise<LedgerReconciliationDifference[]> {
    const rows = await this.prisma.$queryRaw<ReconciliationRow[]>`
      SELECT
        wb.wallet_id AS "walletId",
        wb.currency::text AS "currency",
        wb.amount_minor AS "materializedAmountMinor",
        COALESCE(SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount_minor ELSE -le.amount_minor END), 0) AS "ledgerAmountMinor"
      FROM wallet_balances wb
      LEFT JOIN ledger_entries le ON le.wallet_id = wb.wallet_id AND le.currency = wb.currency
      GROUP BY wb.wallet_id, wb.currency, wb.amount_minor
      HAVING wb.amount_minor <> COALESCE(SUM(CASE WHEN le.direction = 'CREDIT' THEN le.amount_minor ELSE -le.amount_minor END), 0)
    `;
    return rows.map((row) => ({
      walletId: row.walletId,
      currency: row.currency,
      materializedAmountMinor: toSafeNumber(row.materializedAmountMinor),
      ledgerAmountMinor: toSafeNumber(row.ledgerAmountMinor)
    }));
  }

  private async applyEntry(transaction: Prisma.TransactionClient, entry: LedgerRepositoryPostingRequest['entries'][number]): Promise<WalletBalanceRecord> {
    const amountMinor = BigInt(entry.amountMinor);
    if (entry.direction === 'CREDIT') {
      await transaction.walletBalance.update({
        where: { walletId_currency: { walletId: entry.walletId, currency: entry.currency } },
        data: { amountMinor: { increment: amountMinor } }
      });
      return this.findBalance(transaction, entry);
    }

    const updated = await transaction.walletBalance.updateMany({
      where: {
        walletId: entry.walletId,
        currency: entry.currency,
        ...(entry.allowNegativeBalance ? {} : { amountMinor: { gte: amountMinor } })
      },
      data: { amountMinor: { decrement: amountMinor } }
    });
    if (updated.count !== 1) throw insufficientFundsError();
    return this.findBalance(transaction, entry);
  }

  private async findBalance(transaction: Prisma.TransactionClient, entry: LedgerRepositoryPostingRequest['entries'][number]): Promise<WalletBalanceRecord> {
    const balance = await transaction.walletBalance.findUnique({
      where: { walletId_currency: { walletId: entry.walletId, currency: entry.currency } },
      select: { amountMinor: true }
    });
    if (!balance) {
      throw new AppError({ code: 'INTERNAL_ERROR', message: 'Wallet balance not found', statusCode: 500 });
    }
    return balance;
  }

  private async acquireIdempotencyScopeLock(transaction: Prisma.TransactionClient, request: LedgerRepositoryPostingRequest): Promise<void> {
    const lockKey = this.idempotencyScopeLockKey(request);
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
  }

  private idempotencyScopeLockKey(request: LedgerRepositoryPostingRequest): bigint {
    const scope = `${request.actorUserId}:${request.idempotency.endpoint}:${request.idempotency.key}`;
    return createHash('sha256').update(scope).digest().readBigInt64BE(0);
  }

  private toStoredResponse(result: LedgerOperationResult): Prisma.InputJsonObject {
    return {
      operationId: result.operationId,
      status: result.status,
      createdAt: result.createdAt,
      affectedBalances: result.affectedBalances.map((balance) => ({
        walletId: balance.walletId,
        currency: balance.currency,
        balanceAfterMinor: balance.balanceAfterMinor
      }))
    };
  }
}
