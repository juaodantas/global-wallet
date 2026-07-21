import { describe, expect, it } from 'vitest';
import { AppError } from '../src/shared/errors/app-error.js';
import { toFinancialOperationId, toUserId, toWalletId } from '../src/shared/domain/ids.js';
import type { LedgerRepository, LedgerRepositoryPostingRequest } from '../src/modules/ledger/application/ledger-repository.js';
import { LedgerPostingService } from '../src/modules/ledger/application/ledger-posting-service.js';
import type { LedgerOperationResult } from '../src/modules/ledger/domain/types.js';
import { toPositiveMinorAmount } from '../src/modules/ledger/domain/types.js';
import { canonicalPayloadHash } from '../src/modules/ledger/infrastructure/canonical-payload-hash.js';

const actorUserId = toUserId('00000000-0000-4000-8000-000000000001');
const walletId = toWalletId('00000000-0000-4000-8000-100000000001');
const originalOperationId = toFinancialOperationId('00000000-0000-4000-8000-200000000001');

class FakeLedgerRepository implements LedgerRepository {
  readonly postedRequests: LedgerRepositoryPostingRequest[] = [];
  readonly entryAmounts: number[] = [];
  private readonly idempotency = new Map<string, { payloadHash: string; result: LedgerOperationResult }>();
  private readonly balances = new Map<string, number>();
  private sequence = 0;

  setBalance(amountMinor: number): void {
    this.balances.set(this.balanceKey(walletId, 'BRL'), amountMinor);
  }

  getBalance(): number {
    return this.balances.get(this.balanceKey(walletId, 'BRL')) ?? 0;
  }

  async post(request: LedgerRepositoryPostingRequest): Promise<LedgerOperationResult> {
    const idempotencyKey = `${request.actorUserId}:${request.idempotency.endpoint}:${request.idempotency.key}`;
    const existing = this.idempotency.get(idempotencyKey);
    if (existing) {
      if (existing.payloadHash !== request.idempotency.payloadHash) {
        throw new AppError({ code: 'IDEMPOTENCY_CONFLICT', message: 'Conflict', statusCode: 409 });
      }
      return existing.result;
    }

    this.postedRequests.push(request);
    this.sequence += 1;
    const affectedBalances = request.entries.map((entry) => {
      this.entryAmounts.push(entry.amountMinor);
      const key = this.balanceKey(entry.walletId, entry.currency);
      const current = this.balances.get(key) ?? 0;
      const next = entry.direction === 'CREDIT' ? current + entry.amountMinor : current - entry.amountMinor;
      if (entry.direction === 'DEBIT' && next < 0 && !entry.allowNegativeBalance) {
        throw new AppError({ code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds', statusCode: 409 });
      }
      this.balances.set(key, next);
      return { walletId: entry.walletId, currency: entry.currency, balanceAfterMinor: next };
    });

    const result: LedgerOperationResult = {
      operationId: toFinancialOperationId(`00000000-0000-4000-8000-${(300000000000 + this.sequence).toString()}`),
      status: 'COMPLETED',
      createdAt: '2026-07-21T10:00:00.000Z',
      affectedBalances
    };
    this.idempotency.set(idempotencyKey, { payloadHash: request.idempotency.payloadHash, result });
    return result;
  }

  async reconcile() {
    return [];
  }

  private balanceKey(targetWalletId: string, currency: string): string {
    return `${targetWalletId}:${currency}`;
  }
}

function normalDebitRequest(idempotencyKey: string, amountMinor: number, payloadHash = canonicalPayloadHash({ amountMinor })) {
  return {
    actorUserId,
    primaryWalletId: walletId,
    type: 'TRANSFER' as const,
    idempotency: { endpoint: 'transfers:create', key: idempotencyKey, payloadHash },
    entries: [{ walletId, currency: 'BRL' as const, direction: 'DEBIT' as const, amountMinor: toPositiveMinorAmount(amountMinor) }]
  };
}

describe('ledger posting service', () => {
  it('replays the same operation result for the same idempotency key and payload hash', async () => {
    const repository = new FakeLedgerRepository();
    repository.setBalance(1000);
    const service = new LedgerPostingService(repository);

    const first = await service.post(normalDebitRequest('same-key', 200));
    const second = await service.post(normalDebitRequest('same-key', 200));

    expect(second).toEqual(first);
    expect(repository.postedRequests).toHaveLength(1);
    expect(repository.getBalance()).toBe(800);
  });

  it('rejects the same idempotency key with a different payload hash before a second mutation', async () => {
    const repository = new FakeLedgerRepository();
    repository.setBalance(1000);
    const service = new LedgerPostingService(repository);

    await service.post(normalDebitRequest('conflict-key', 200, 'hash-one'));
    await expect(service.post(normalDebitRequest('conflict-key', 300, 'hash-two'))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });

    expect(repository.postedRequests).toHaveLength(1);
    expect(repository.getBalance()).toBe(800);
  });

  it('prevents normal debits from producing negative balances', async () => {
    const repository = new FakeLedgerRepository();
    repository.setBalance(100);
    const service = new LedgerPostingService(repository);

    await expect(service.post(normalDebitRequest('too-large', 200))).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });

    expect(repository.getBalance()).toBe(100);
  });

  it('does not expose negative-balance bypass through normal postings', async () => {
    const repository = new FakeLedgerRepository();
    repository.setBalance(100);
    const service = new LedgerPostingService(repository);

    await service.post(normalDebitRequest('normal', 50));

    expect(repository.postedRequests[0]?.entries[0]?.allowNegativeBalance).toBe(false);
  });

  it('allows reversal postings to debit into an exceptional negative balance', async () => {
    const repository = new FakeLedgerRepository();
    repository.setBalance(100);
    const service = new LedgerPostingService(repository);

    const result = await service.postReversal({
      actorUserId,
      primaryWalletId: walletId,
      originalOperationId,
      idempotency: { endpoint: 'reversals:create', key: 'reversal-key', payloadHash: canonicalPayloadHash({ originalOperationId }) },
      entries: [{ walletId, currency: 'BRL', direction: 'DEBIT', amountMinor: toPositiveMinorAmount(200) }]
    });

    expect(result.affectedBalances[0]?.balanceAfterMinor).toBe(-100);
    expect(repository.postedRequests[0]?.type).toBe('REVERSAL');
    expect(repository.postedRequests[0]?.entries[0]?.allowNegativeBalance).toBe(true);
  });

  it('keeps movement amounts positive and records balance snapshots', async () => {
    const repository = new FakeLedgerRepository();
    repository.setBalance(100);
    const service = new LedgerPostingService(repository);

    const result = await service.post({
      actorUserId,
      primaryWalletId: walletId,
      type: 'DEPOSIT',
      idempotency: { endpoint: 'deposits:confirm', key: 'deposit-key', payloadHash: canonicalPayloadHash({ depositId: '00000000-0000-4000-8000-400000000001' }) },
      entries: [{ walletId, currency: 'BRL', direction: 'CREDIT', amountMinor: toPositiveMinorAmount(250) }]
    });

    expect(repository.entryAmounts).toEqual([250]);
    expect(result.affectedBalances).toEqual([{ walletId, currency: 'BRL', balanceAfterMinor: 350 }]);
  });

  it('preserves non-negative balances across concurrent normal debit requests', async () => {
    const repository = new FakeLedgerRepository();
    repository.setBalance(100);
    const service = new LedgerPostingService(repository);

    const results = await Promise.allSettled([
      service.post(normalDebitRequest('concurrent-one', 80)),
      service.post(normalDebitRequest('concurrent-two', 80))
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(repository.getBalance()).toBe(20);
  });
});
