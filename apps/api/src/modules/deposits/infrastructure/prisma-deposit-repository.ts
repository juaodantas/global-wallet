import type { PrismaClient } from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { acquireIdempotencyScopeLock } from '../../../shared/db/idempotency.js';
import type { UserId } from '../../../shared/domain/ids.js';
import type { LedgerTransaction } from '../../ledger/application/ledger-repository.js';
import type { DepositIdempotencyRecord, DepositRecord, DepositRepository } from '../application/deposit-repository.js';

export class PrismaDepositRepository implements DepositRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async runInTransaction<T>(handler: (transaction: LedgerTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(handler);
  }

  async lockIdempotencyScope(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<void> {
    await acquireIdempotencyScopeLock(transaction, input);
  }

  async findIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<DepositIdempotencyRecord | null> {
    return transaction.idempotencyRecord.findFirst({ where: input, select: { id: true, payloadHash: true, storedResponse: true } });
  }

  async createIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string; payloadHash: string; storedResponse?: InputJsonValue }): Promise<DepositIdempotencyRecord> {
    return transaction.idempotencyRecord.create({ data: input, select: { id: true, payloadHash: true, storedResponse: true } });
  }

  async storeIdempotencyResponse(transaction: LedgerTransaction, input: { id: string; storedResponse: InputJsonValue }): Promise<void> {
    await transaction.idempotencyRecord.update({ where: { id: input.id }, data: { storedResponse: input.storedResponse } });
  }

  async findWalletIdByUser(transaction: LedgerTransaction, userId: UserId): Promise<string | null> {
    const wallet = await transaction.wallet.findUnique({ where: { userId }, select: { id: true } });
    return wallet?.id ?? null;
  }

  async createPendingDeposit(transaction: LedgerTransaction, input: { userId: UserId; walletId: string; amountMinor: number; gatewayReference: string }): Promise<DepositRecord> {
    return transaction.deposit.create({ data: { userId: input.userId, walletId: input.walletId, amountMinor: BigInt(input.amountMinor), currency: 'BRL', status: 'PENDING', gatewayReference: input.gatewayReference } });
  }

  async findDeposit(transaction: LedgerTransaction, input: { userId: UserId; depositId: string }): Promise<DepositRecord | null> {
    return transaction.deposit.findFirst({ where: { id: input.depositId, userId: input.userId } });
  }

  async claimPendingDeposit(transaction: LedgerTransaction, input: { userId: UserId; depositId: string; confirmedAt: Date }): Promise<boolean> {
    const result = await transaction.deposit.updateMany({ where: { id: input.depositId, userId: input.userId, status: 'PENDING' }, data: { status: 'CONFIRMED', confirmedAt: input.confirmedAt } });
    return result.count === 1;
  }

  async attachOperation(transaction: LedgerTransaction, input: { depositId: string; operationId: string }): Promise<DepositRecord> {
    return transaction.deposit.update({ where: { id: input.depositId }, data: { operationId: input.operationId } });
  }

  async listByUser(userId: UserId): Promise<DepositRecord[]> {
    return this.prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
