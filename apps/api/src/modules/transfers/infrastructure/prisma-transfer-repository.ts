import type { Currency, PrismaClient } from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { acquireIdempotencyScopeLock } from '../../../shared/db/idempotency.js';
import type { UserId } from '../../../shared/domain/ids.js';
import type { LedgerTransaction } from '../../ledger/application/ledger-repository.js';
import type { TransferIdempotencyRecord, TransferParticipantRecord, TransferRecord, TransferRepository } from '../application/transfer-repository.js';

export class PrismaTransferRepository implements TransferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async runInTransaction<T>(handler: (transaction: LedgerTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(handler);
  }

  async lockIdempotencyScope(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<void> {
    await acquireIdempotencyScopeLock(transaction, input);
  }

  async findIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<TransferIdempotencyRecord | null> {
    return transaction.idempotencyRecord.findFirst({ where: input, select: { id: true, payloadHash: true, storedResponse: true } });
  }

  async createIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string; payloadHash: string }): Promise<TransferIdempotencyRecord> {
    return transaction.idempotencyRecord.create({ data: input, select: { id: true, payloadHash: true, storedResponse: true } });
  }

  async storeIdempotencyResponse(transaction: LedgerTransaction, input: { id: string; storedResponse: InputJsonValue }): Promise<void> {
    await transaction.idempotencyRecord.update({ where: { id: input.id }, data: { storedResponse: input.storedResponse } });
  }

  async findParticipants(transaction: LedgerTransaction, input: { userId: UserId; recipientEmail: string }): Promise<TransferParticipantRecord | null> {
    const senderWallet = await transaction.wallet.findUnique({ where: { userId: input.userId }, select: { id: true } });
    const recipient = await transaction.user.findUnique({ where: { email: input.recipientEmail }, select: { id: true, email: true, wallet: { select: { id: true } } } });
    if (!senderWallet || !recipient?.wallet) return null;
    return { senderWalletId: senderWallet.id, recipientUserId: recipient.id, recipientWalletId: recipient.wallet.id, recipientEmail: recipient.email };
  }

  async createTransfer(transaction: LedgerTransaction, input: { operationId: string; senderWalletId: string; recipientWalletId: string; recipientEmail: string; currency: Currency; amountMinor: number }): Promise<TransferRecord> {
    return transaction.transfer.create({
      data: { operationId: input.operationId, senderWalletId: input.senderWalletId, recipientWalletId: input.recipientWalletId, recipientEmail: input.recipientEmail, currency: input.currency, amountMinor: BigInt(input.amountMinor) },
      include: { operation: { select: { id: true, type: true, status: true, createdAt: true } } }
    });
  }

  async setOperationCorrelationId(transaction: LedgerTransaction, input: { operationId: string; correlationId: string }): Promise<void> {
    await transaction.financialOperation.update({ where: { id: input.operationId }, data: { correlationId: input.correlationId } });
  }

  async findWalletIdByUser(userId: UserId): Promise<string | null> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
    return wallet?.id ?? null;
  }

  async listByWallet(walletId: string): Promise<TransferRecord[]> {
    return this.prisma.transfer.findMany({
      where: { OR: [{ senderWalletId: walletId }, { recipientWalletId: walletId }] },
      orderBy: { createdAt: 'desc' },
      include: { operation: { select: { id: true, type: true, status: true, createdAt: true } } }
    });
  }
}
