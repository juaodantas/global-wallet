import { Prisma, type PrismaClient } from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { acquireIdempotencyScopeLock } from '../../../shared/db/idempotency.js';
import type { UserId } from '../../../shared/domain/ids.js';
import type { LedgerTransaction } from '../../ledger/application/ledger-repository.js';
import type { ConversionRecord, ExchangeIdempotencyRecord, ExchangeRateInput, ExchangeRepository, QuoteRecord } from '../application/exchange-repository.js';

export class PrismaExchangeRepository implements ExchangeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async runInTransaction<T>(handler: (transaction: LedgerTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(handler);
  }

  async lockIdempotencyScope(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<void> {
    await acquireIdempotencyScopeLock(transaction, input);
  }

  async findIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string }): Promise<ExchangeIdempotencyRecord | null> {
    return transaction.idempotencyRecord.findFirst({ where: input, select: { id: true, payloadHash: true, storedResponse: true } });
  }

  async createIdempotencyRecord(transaction: LedgerTransaction, input: { userId: UserId; endpoint: string; key: string; payloadHash: string }): Promise<ExchangeIdempotencyRecord> {
    return transaction.idempotencyRecord.create({ data: input, select: { id: true, payloadHash: true, storedResponse: true } });
  }

  async storeIdempotencyResponse(transaction: LedgerTransaction, input: { id: string; storedResponse: InputJsonValue }): Promise<void> {
    await transaction.idempotencyRecord.update({ where: { id: input.id }, data: { storedResponse: input.storedResponse } });
  }

  async findWalletIdByUser(userId: UserId): Promise<string | null> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { id: true } });
    return wallet?.id ?? null;
  }

  async createQuote(input: { userId: UserId; walletId: string; sourceCurrency: ExchangeRateInput['baseCurrency']; targetCurrency: ExchangeRateInput['quoteCurrency']; sourceAmountMinor: number; targetAmountMinor: number; rate: ExchangeRateInput; expiresAt: Date }): Promise<QuoteRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const snapshot = await transaction.exchangeRateSnapshot.create({ data: { provider: input.rate.provider, baseCurrency: input.rate.baseCurrency, quoteCurrency: input.rate.quoteCurrency, rate: new Prisma.Decimal(input.rate.rate), fetchedAt: input.rate.fetchedAt, ...(input.rate.rawPayloadHash ? { rawPayloadHash: input.rate.rawPayloadHash } : {}) } });
      return transaction.exchangeQuote.create({
        data: { walletId: input.walletId, userId: input.userId, sourceCurrency: input.sourceCurrency, targetCurrency: input.targetCurrency, sourceAmountMinor: BigInt(input.sourceAmountMinor), targetAmountMinor: BigInt(input.targetAmountMinor), rate: new Prisma.Decimal(input.rate.rate), rateSnapshotId: snapshot.id, status: 'ACTIVE', expiresAt: input.expiresAt },
        include: { rateSnapshot: { select: { provider: true, fetchedAt: true } } }
      });
    });
  }

  async findQuote(transaction: LedgerTransaction, input: { userId: UserId; quoteId: string }): Promise<QuoteRecord | null> {
    return transaction.exchangeQuote.findFirst({ where: { id: input.quoteId, userId: input.userId }, include: { rateSnapshot: { select: { provider: true, fetchedAt: true } } } });
  }

  async claimActiveQuote(transaction: LedgerTransaction, input: { userId: UserId; quoteId: string; usedAt: Date }): Promise<boolean> {
    const result = await transaction.exchangeQuote.updateMany({ where: { id: input.quoteId, userId: input.userId, status: 'ACTIVE' }, data: { status: 'USED', usedAt: input.usedAt } });
    return result.count === 1;
  }

  async expireActiveQuote(input: { userId: UserId; quoteId: string; now: Date }): Promise<void> {
    await this.prisma.exchangeQuote.updateMany({ where: { id: input.quoteId, userId: input.userId, status: 'ACTIVE', expiresAt: { lte: input.now } }, data: { status: 'EXPIRED' } });
  }

  async createConversion(transaction: LedgerTransaction, input: { quote: QuoteRecord; userId: UserId; operationId: string }): Promise<ConversionRecord> {
    return transaction.exchangeConversion.create({
      data: { quoteId: input.quote.id, operationId: input.operationId, walletId: input.quote.walletId, userId: input.userId, sourceCurrency: input.quote.sourceCurrency, targetCurrency: input.quote.targetCurrency, sourceAmountMinor: input.quote.sourceAmountMinor, targetAmountMinor: input.quote.targetAmountMinor, rate: input.quote.rate },
      include: { quote: { include: { rateSnapshot: { select: { provider: true } } } }, operation: { select: { id: true, type: true, status: true, createdAt: true } } }
    });
  }

  async setOperationCorrelationId(transaction: LedgerTransaction, input: { operationId: string; correlationId: string }): Promise<void> {
    await transaction.financialOperation.update({ where: { id: input.operationId }, data: { correlationId: input.correlationId } });
  }
}
