import type { Currency } from '@prisma/client';
import type { Decimal, InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
import { exchangeConversionSchema, exchangeQuoteSchema, type ExchangeConversionDto, type ExchangeQuoteDto } from '@global-wallet/contracts';
import { canonicalPayloadHash } from '../../../shared/idempotency/canonical-payload-hash.js';
import type { LedgerPostingService } from '../../ledger/application/ledger-posting-service.js';
import { toPositiveMinorAmount } from '../../ledger/domain/types.js';
import type { UserId } from '../../../shared/domain/ids.js';
import { toWalletId } from '../../../shared/domain/ids.js';
import { bigintToSafeNumber } from '../../../shared/db/decimal.js';
import { idempotencyConflictError, missingStoredResponseError } from '../../../shared/db/idempotency.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { quoteAlreadyUsedError, quoteExpiredError, quoteNotFoundError, unsupportedCurrencyPairError } from '../domain/errors.js';
import { calculateTargetAmountMinor } from '../domain/rounding.js';
import type { ExchangeRateProvider } from './exchange-rate-provider.js';
import type { ConversionRecord, ExchangeRepository } from './exchange-repository.js';

type QuoteDtoRecord = { id: string; sourceCurrency: Currency; targetCurrency: Currency; sourceAmountMinor: bigint; targetAmountMinor: bigint; rate: Decimal; status: 'ACTIVE' | 'USED' | 'EXPIRED'; expiresAt: Date; createdAt: Date; rateSnapshot: { provider: string; fetchedAt: Date } };

export class ExchangeService {
  constructor(private readonly repository: ExchangeRepository, private readonly ledger: LedgerPostingService, private readonly rateProvider: ExchangeRateProvider) {}

  async createQuote(input: { userId: UserId; sourceCurrency: Currency; targetCurrency: Currency; sourceAmountMinor: number }): Promise<ExchangeQuoteDto> {
    if (input.sourceCurrency === input.targetCurrency) throw unsupportedCurrencyPairError();
    const walletId = await this.repository.findWalletIdByUser(input.userId);
    if (!walletId) throw quoteNotFoundError();
    const rate = await this.rateProvider.getRate(input.sourceCurrency, input.targetCurrency);
    const targetAmountMinor = calculateTargetAmountMinor(input.sourceAmountMinor, rate.rate);
    const quote = await this.repository.createQuote({
      walletId,
      userId: input.userId,
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
      sourceAmountMinor: input.sourceAmountMinor,
      targetAmountMinor,
      rate,
      expiresAt: new Date(rate.fetchedAt.getTime() + 5 * 60 * 1000)
    });
    return this.toQuoteDto(quote);
  }

  async executeConversion(input: { userId: UserId; quoteId: string; idempotencyKey: string }): Promise<ExchangeConversionDto> {
    const endpoint = 'POST /exchange/conversions';
    const payloadHash = canonicalPayloadHash({ quoteId: input.quoteId });
    try {
      return await this.repository.runInTransaction(async (transaction) => {
        await this.repository.lockIdempotencyScope(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
        const existing = await this.repository.findIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
        if (existing) return this.replay(existing, payloadHash);
        const idempotencyRecord = await this.repository.createIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey, payloadHash });
        const quote = await this.repository.findQuote(transaction, { quoteId: input.quoteId, userId: input.userId });
        if (!quote) throw quoteNotFoundError();
        if (quote.status === 'USED') throw quoteAlreadyUsedError();
        const now = new Date();
        if (quote.status === 'EXPIRED' || now.getTime() >= quote.expiresAt.getTime()) throw quoteExpiredError();
        const claimed = await this.repository.claimActiveQuote(transaction, { quoteId: quote.id, userId: input.userId, usedAt: now });
        if (!claimed) {
          const latest = await this.repository.findQuote(transaction, { quoteId: input.quoteId, userId: input.userId });
          if (!latest) throw quoteNotFoundError();
          if (latest.status === 'EXPIRED' || now.getTime() >= latest.expiresAt.getTime()) throw quoteExpiredError();
          throw quoteAlreadyUsedError();
        }
        const ledgerResult = await this.ledger.postInTransaction(transaction, {
          actorUserId: input.userId,
          primaryWalletId: toWalletId(quote.walletId),
          type: 'EXCHANGE_CONVERSION',
          idempotency: { endpoint, key: input.idempotencyKey, payloadHash },
          idempotencyRecordId: idempotencyRecord.id,
          entries: [
            { walletId: toWalletId(quote.walletId), currency: quote.sourceCurrency, direction: 'DEBIT', amountMinor: toPositiveMinorAmount(bigintToSafeNumber(quote.sourceAmountMinor)) },
            { walletId: toWalletId(quote.walletId), currency: quote.targetCurrency, direction: 'CREDIT', amountMinor: toPositiveMinorAmount(bigintToSafeNumber(quote.targetAmountMinor)) }
          ]
        });
        const conversion = await this.repository.createConversion(transaction, { quote, userId: input.userId, operationId: ledgerResult.operationId });
        await this.repository.setOperationCorrelationId(transaction, { operationId: ledgerResult.operationId, correlationId: conversion.id });
        const response = this.toConversionDto(conversion);
        await this.repository.storeIdempotencyResponse(transaction, { id: idempotencyRecord.id, storedResponse: this.toJson(response) });
        return response;
      });
    } catch (error) {
      if (error instanceof AppError && error.code === 'QUOTE_EXPIRED') await this.repository.expireActiveQuote({ userId: input.userId, quoteId: input.quoteId, now: new Date() });
      throw error;
    }
  }

  private replay(record: { payloadHash: string; storedResponse: JsonValue | null }, payloadHash: string): ExchangeConversionDto {
    if (record.payloadHash !== payloadHash) throw idempotencyConflictError();
    if (!record.storedResponse) throw missingStoredResponseError();
    return exchangeConversionSchema.parse(record.storedResponse);
  }

  private toQuoteDto(quote: QuoteDtoRecord): ExchangeQuoteDto {
    return exchangeQuoteSchema.parse({
      quoteId: quote.id,
      sourceCurrency: quote.sourceCurrency,
      targetCurrency: quote.targetCurrency,
      sourceAmountMinor: bigintToSafeNumber(quote.sourceAmountMinor),
      targetAmountMinor: bigintToSafeNumber(quote.targetAmountMinor),
      rate: quote.rate.toFixed(10),
      provider: quote.rateSnapshot.provider,
      status: quote.status,
      fetchedAt: quote.rateSnapshot.fetchedAt.toISOString(),
      expiresAt: quote.expiresAt.toISOString(),
      createdAt: quote.createdAt.toISOString()
    });
  }

  private toConversionDto(conversion: ConversionRecord): ExchangeConversionDto {
    return exchangeConversionSchema.parse({
      conversionId: conversion.id,
      operation: { operationId: conversion.operation.id, type: conversion.operation.type, status: conversion.operation.status, createdAt: conversion.operation.createdAt.toISOString() },
      quoteId: conversion.quoteId,
      sourceCurrency: conversion.sourceCurrency,
      targetCurrency: conversion.targetCurrency,
      sourceAmountMinor: bigintToSafeNumber(conversion.sourceAmountMinor),
      targetAmountMinor: bigintToSafeNumber(conversion.targetAmountMinor),
      rate: conversion.rate.toFixed(10),
      provider: conversion.quote.rateSnapshot.provider,
      createdAt: conversion.createdAt.toISOString()
    });
  }

  private toJson(response: ExchangeConversionDto): InputJsonValue {
    return { ...response };
  }
}
