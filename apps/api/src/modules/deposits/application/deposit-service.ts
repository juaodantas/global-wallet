import { randomUUID } from 'node:crypto';
import type { Currency } from '@prisma/client';
import type { InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
import { depositListSchema, depositSchema, type DepositDto } from '@global-wallet/contracts';
import { canonicalPayloadHash } from '../../../shared/idempotency/canonical-payload-hash.js';
import type { LedgerPostingService } from '../../ledger/application/ledger-posting-service.js';
import { toPositiveMinorAmount } from '../../ledger/domain/types.js';
import type { UserId } from '../../../shared/domain/ids.js';
import { toWalletId } from '../../../shared/domain/ids.js';
import { bigintToSafeNumber } from '../../../shared/db/decimal.js';
import { idempotencyConflictError, missingStoredResponseError } from '../../../shared/db/idempotency.js';
import { depositAlreadyConfirmedError, depositNotConfirmableError, depositNotFoundError } from '../domain/errors.js';
import type { DepositRepository } from './deposit-repository.js';

type DepositDtoRecord = { id: string; operationId: string | null; currency: Currency; amountMinor: bigint; status: 'PENDING' | 'CONFIRMED' | 'FAILED'; gatewayReference: string | null; confirmedAt: Date | null; createdAt: Date };

export class DepositService {
  constructor(private readonly repository: DepositRepository, private readonly ledger: LedgerPostingService) {}

  async create(input: { userId: UserId; amountMinor: number; idempotencyKey: string }): Promise<DepositDto> {
    const endpoint = 'POST /deposits';
    const payloadHash = canonicalPayloadHash({ amountMinor: input.amountMinor });
    return this.repository.runInTransaction(async (transaction) => {
      await this.repository.lockIdempotencyScope(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
      const existing = await this.repository.findIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
      if (existing) return this.replayDeposit(existing, payloadHash);
      const walletId = await this.repository.findWalletIdByUser(transaction, input.userId);
      if (!walletId) throw depositNotFoundError();
      const deposit = await this.repository.createPendingDeposit(transaction, { userId: input.userId, walletId, amountMinor: input.amountMinor, gatewayReference: `gw_${randomUUID()}` });
      const response = this.toDto(deposit);
      await this.repository.createIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey, payloadHash, storedResponse: this.toJson(response) });
      return response;
    });
  }

  async confirm(input: { userId: UserId; depositId: string; idempotencyKey: string }): Promise<DepositDto> {
    const endpoint = 'POST /deposits/:depositId/confirm';
    const payloadHash = canonicalPayloadHash({ depositId: input.depositId });
    return this.repository.runInTransaction(async (transaction) => {
      await this.repository.lockIdempotencyScope(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
      const existing = await this.repository.findIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
      if (existing) return this.replayDeposit(existing, payloadHash);
      const idempotencyRecord = await this.repository.createIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey, payloadHash });
      const deposit = await this.repository.findDeposit(transaction, { depositId: input.depositId, userId: input.userId });
      if (!deposit) throw depositNotFoundError();
      if (deposit.status === 'CONFIRMED') throw depositAlreadyConfirmedError();
      if (deposit.status !== 'PENDING') throw depositNotConfirmableError();
      const confirmedAt = new Date();
      const claimed = await this.repository.claimPendingDeposit(transaction, { depositId: deposit.id, userId: input.userId, confirmedAt });
      if (!claimed) {
        const latest = await this.repository.findDeposit(transaction, { depositId: input.depositId, userId: input.userId });
        if (!latest) throw depositNotFoundError();
        if (latest.status === 'CONFIRMED') throw depositAlreadyConfirmedError();
        throw depositNotConfirmableError();
      }
      const ledgerResult = await this.ledger.postInTransaction(transaction, {
        actorUserId: input.userId,
        primaryWalletId: toWalletId(deposit.walletId),
        type: 'DEPOSIT',
        correlationId: deposit.id,
        idempotency: { endpoint, key: input.idempotencyKey, payloadHash },
        idempotencyRecordId: idempotencyRecord.id,
        entries: [{ walletId: toWalletId(deposit.walletId), currency: deposit.currency, direction: 'CREDIT', amountMinor: toPositiveMinorAmount(bigintToSafeNumber(deposit.amountMinor)) }]
      });
      const confirmed = await this.repository.attachOperation(transaction, { depositId: deposit.id, operationId: ledgerResult.operationId });
      const response = this.toDto(confirmed);
      await this.repository.storeIdempotencyResponse(transaction, { id: idempotencyRecord.id, storedResponse: this.toJson(response) });
      return response;
    });
  }

  async list(userId: UserId): Promise<DepositDto[]> {
    const deposits = await this.repository.listByUser(userId);
    return depositListSchema.parse(deposits.map((deposit) => this.toDto(deposit)));
  }

  private replayDeposit(record: { payloadHash: string; storedResponse: JsonValue | null }, payloadHash: string): DepositDto {
    if (record.payloadHash !== payloadHash) throw idempotencyConflictError();
    if (!record.storedResponse) throw missingStoredResponseError();
    return depositSchema.parse(record.storedResponse);
  }

  private toDto(deposit: DepositDtoRecord): DepositDto {
    return depositSchema.parse({
      depositId: deposit.id,
      ...(deposit.operationId ? { operationId: deposit.operationId } : {}),
      currency: deposit.currency,
      amountMinor: bigintToSafeNumber(deposit.amountMinor),
      status: deposit.status,
      ...(deposit.gatewayReference ? { gatewayReference: deposit.gatewayReference } : {}),
      ...(deposit.confirmedAt ? { confirmedAt: deposit.confirmedAt.toISOString() } : {}),
      createdAt: deposit.createdAt.toISOString()
    });
  }

  private toJson(response: DepositDto): InputJsonValue {
    return { ...response };
  }
}
