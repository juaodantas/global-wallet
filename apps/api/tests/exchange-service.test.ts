import { describe, expect, it } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import type { Currency as ContractsCurrency } from '@global-wallet/contracts';
import { ExchangeService } from '../src/modules/exchange/application/exchange-service.js';
import type { ExchangeRate, ExchangeRateProvider } from '../src/modules/exchange/application/exchange-rate-provider.js';
import type { ConversionRecord, ExchangeIdempotencyRecord, ExchangeRepository, QuoteRecord } from '../src/modules/exchange/application/exchange-repository.js';
import { LedgerPostingService } from '../src/modules/ledger/application/ledger-posting-service.js';
import type { LedgerRepository, LedgerTransaction, LedgerRepositoryAtomicPostingRequest, LedgerRepositoryPostingRequest, LedgerReconciliationDifference } from '../src/modules/ledger/application/ledger-repository.js';
import type { LedgerOperationResult } from '../src/modules/ledger/domain/types.js';
import { toFinancialOperationId, toUserId } from '../src/shared/domain/ids.js';
import { AppError } from '../src/shared/errors/app-error.js';

const userId = toUserId('00000000-0000-4000-8000-000000000001');
const walletId = '00000000-0000-4000-8000-000000000101';
const quoteId = '00000000-0000-4000-8000-000000000201';
const operationId = toFinancialOperationId('00000000-0000-4000-8000-000000000301');
const ledgerOperationResult: LedgerOperationResult = { operationId, status: 'COMPLETED', createdAt: '2026-07-21T10:00:00.000Z', affectedBalances: [] };

class CountingRateProvider implements ExchangeRateProvider {
  calls = 0;

  constructor(private readonly failure?: AppError) {}

  async getRate(baseCurrency: ContractsCurrency, quoteCurrency: ContractsCurrency): Promise<ExchangeRate> {
    this.calls += 1;
    if (this.failure) throw this.failure;
    return { provider: 'frankfurter', baseCurrency, quoteCurrency, rate: '5.0000000000', fetchedAt: new Date('2026-07-21T10:00:00.000Z'), rawPayloadHash: 'hash' };
  }
}

class FakeExchangeRepository implements ExchangeRepository {
  createQuoteCalls = 0;
  createConversionCalls = 0;
  private readonly transaction = {} as LedgerTransaction;
  private readonly quote: QuoteRecord = {
    id: quoteId,
    walletId,
    sourceCurrency: 'USD',
    targetCurrency: 'BRL',
    sourceAmountMinor: BigInt(100),
    targetAmountMinor: BigInt(500),
    rate: new Decimal('5.0000000000'),
    status: 'ACTIVE',
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-21T10:00:00.000Z'),
    rateSnapshot: { provider: 'frankfurter', fetchedAt: new Date('2026-07-21T10:00:00.000Z') }
  };

  async runInTransaction<T>(handler: (transaction: LedgerTransaction) => Promise<T>): Promise<T> {
    return handler(this.transaction);
  }

  async lockIdempotencyScope(): Promise<void> {}

  async findIdempotencyRecord(): Promise<ExchangeIdempotencyRecord | null> {
    return null;
  }

  async createIdempotencyRecord(): Promise<ExchangeIdempotencyRecord> {
    return { id: '00000000-0000-4000-8000-000000000401', payloadHash: 'hash', storedResponse: null };
  }

  async storeIdempotencyResponse(): Promise<void> {}

  async findWalletIdByUser(): Promise<string | null> {
    return walletId;
  }

  async createQuote(): Promise<QuoteRecord> {
    this.createQuoteCalls += 1;
    return this.quote;
  }

  async findQuote(): Promise<QuoteRecord | null> {
    return this.quote;
  }

  async claimActiveQuote(): Promise<boolean> {
    return true;
  }

  async expireActiveQuote(): Promise<void> {}

  async createConversion(): Promise<ConversionRecord> {
    this.createConversionCalls += 1;
    return {
      id: '00000000-0000-4000-8000-000000000501',
      quoteId,
      sourceCurrency: this.quote.sourceCurrency,
      targetCurrency: this.quote.targetCurrency,
      sourceAmountMinor: this.quote.sourceAmountMinor,
      targetAmountMinor: this.quote.targetAmountMinor,
      rate: this.quote.rate,
      createdAt: new Date('2026-07-21T10:00:00.000Z'),
      quote: { rateSnapshot: this.quote.rateSnapshot },
      operation: { id: operationId, type: 'EXCHANGE_CONVERSION', status: 'COMPLETED', createdAt: new Date('2026-07-21T10:00:00.000Z') }
    };
  }

  async setOperationCorrelationId(): Promise<void> {}
}

class FakeLedgerRepository implements LedgerRepository {
  postInTransactionCalls = 0;

  async post(_request: LedgerRepositoryPostingRequest): Promise<LedgerOperationResult> {
    return ledgerOperationResult;
  }

  async postInTransaction(_transaction: LedgerTransaction, _request: LedgerRepositoryAtomicPostingRequest): Promise<LedgerOperationResult> {
    this.postInTransactionCalls += 1;
    return ledgerOperationResult;
  }

  async reconcile(): Promise<LedgerReconciliationDifference[]> {
    return [];
  }
}

function createService(repository: FakeExchangeRepository, rateProvider: ExchangeRateProvider, ledgerRepository = new FakeLedgerRepository()): ExchangeService {
  return new ExchangeService(repository, new LedgerPostingService(ledgerRepository), rateProvider);
}

describe('ExchangeService Frankfurter boundaries', () => {
  it('does not persist a quote when the external rate provider fails', async () => {
    const repository = new FakeExchangeRepository();
    const provider = new CountingRateProvider(new AppError({ code: 'EXTERNAL_SERVICE_FAILURE', message: 'External rate provider failed', statusCode: 502 }));
    const service = createService(repository, provider);

    await expect(service.createQuote({ userId, sourceCurrency: 'USD', targetCurrency: 'BRL', sourceAmountMinor: 100 })).rejects.toMatchObject({ code: 'EXTERNAL_SERVICE_FAILURE' });

    expect(provider.calls).toBe(1);
    expect(repository.createQuoteCalls).toBe(0);
  });

  it('executes a conversion using the persisted quote without refetching rates', async () => {
    const repository = new FakeExchangeRepository();
    const ledgerRepository = new FakeLedgerRepository();
    const provider = new CountingRateProvider();
    const service = createService(repository, provider, ledgerRepository);

    await expect(service.executeConversion({ userId, quoteId, idempotencyKey: 'conversion-key' })).resolves.toMatchObject({ quoteId, provider: 'frankfurter' });

    expect(provider.calls).toBe(0);
    expect(repository.createConversionCalls).toBe(1);
    expect(ledgerRepository.postInTransactionCalls).toBe(1);
  });
});
