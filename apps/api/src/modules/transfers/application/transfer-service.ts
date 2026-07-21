import type { Currency } from '@prisma/client';
import type { InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
import { transferListSchema, transferSchema, type TransferDto, type WalletBalanceDto } from '@global-wallet/contracts';
import { canonicalPayloadHash } from '../../../shared/idempotency/canonical-payload-hash.js';
import type { LedgerPostingService } from '../../ledger/application/ledger-posting-service.js';
import { toPositiveMinorAmount } from '../../ledger/domain/types.js';
import type { UserId } from '../../../shared/domain/ids.js';
import { toWalletId } from '../../../shared/domain/ids.js';
import { bigintToSafeNumber } from '../../../shared/db/decimal.js';
import { idempotencyConflictError, missingStoredResponseError } from '../../../shared/db/idempotency.js';
import { recipientNotFoundError, sameTransferParticipantError } from '../domain/errors.js';
import type { TransferRecord, TransferRepository } from './transfer-repository.js';

export class TransferService {
  constructor(private readonly repository: TransferRepository, private readonly ledger: LedgerPostingService) {}

  async create(input: { userId: UserId; recipientEmail: string; currency: Currency; amountMinor: number; idempotencyKey: string }): Promise<TransferDto> {
    const endpoint = 'POST /transfers';
    const payloadHash = canonicalPayloadHash({ recipientEmail: input.recipientEmail, currency: input.currency, amountMinor: input.amountMinor });
    return this.repository.runInTransaction(async (transaction) => {
      await this.repository.lockIdempotencyScope(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
      const existing = await this.repository.findIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });
      if (existing) return this.replay(existing, payloadHash);
      const participants = await this.repository.findParticipants(transaction, { userId: input.userId, recipientEmail: input.recipientEmail });
      if (!participants) throw recipientNotFoundError();
      if (participants.recipientUserId === input.userId || participants.recipientWalletId === participants.senderWalletId) throw sameTransferParticipantError();
      const idempotencyRecord = await this.repository.createIdempotencyRecord(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey, payloadHash });
      const ledgerResult = await this.ledger.postInTransaction(transaction, {
        actorUserId: input.userId,
        primaryWalletId: toWalletId(participants.senderWalletId),
        type: 'TRANSFER',
        idempotency: { endpoint, key: input.idempotencyKey, payloadHash },
        idempotencyRecordId: idempotencyRecord.id,
        entries: [
          { walletId: toWalletId(participants.senderWalletId), currency: input.currency, direction: 'DEBIT', amountMinor: toPositiveMinorAmount(input.amountMinor) },
          { walletId: toWalletId(participants.recipientWalletId), currency: input.currency, direction: 'CREDIT', amountMinor: toPositiveMinorAmount(input.amountMinor) }
        ]
      });
      const transfer = await this.repository.createTransfer(transaction, { operationId: ledgerResult.operationId, senderWalletId: participants.senderWalletId, recipientWalletId: participants.recipientWalletId, recipientEmail: participants.recipientEmail, currency: input.currency, amountMinor: input.amountMinor });
      await this.repository.setOperationCorrelationId(transaction, { operationId: ledgerResult.operationId, correlationId: transfer.id });
      const response = this.toDto(transfer, this.balancesFromLedger(ledgerResult.affectedBalances, participants.senderWalletId, participants.recipientWalletId, input.currency));
      await this.repository.storeIdempotencyResponse(transaction, { id: idempotencyRecord.id, storedResponse: this.toJson(response) });
      return response;
    });
  }

  async list(userId: UserId): Promise<TransferDto[]> {
    const walletId = await this.repository.findWalletIdByUser(userId);
    if (!walletId) return [];
    const transfers = await this.repository.listByWallet(walletId);
    return transferListSchema.parse(transfers.map((transfer) => this.toDto(transfer)));
  }

  private replay(record: { payloadHash: string; storedResponse: JsonValue | null }, payloadHash: string): TransferDto {
    if (record.payloadHash !== payloadHash) throw idempotencyConflictError();
    if (!record.storedResponse) throw missingStoredResponseError();
    return transferSchema.parse(record.storedResponse);
  }

  private toDto(transfer: TransferRecord, balances?: { source?: WalletBalanceDto; recipient?: WalletBalanceDto }): TransferDto {
    return transferSchema.parse({
      transferId: transfer.id,
      operation: { operationId: transfer.operation.id, type: transfer.operation.type, status: transfer.operation.status, createdAt: transfer.operation.createdAt.toISOString() },
      senderWalletId: transfer.senderWalletId,
      recipientWalletId: transfer.recipientWalletId,
      recipientEmail: transfer.recipientEmail,
      currency: transfer.currency,
      amountMinor: bigintToSafeNumber(transfer.amountMinor),
      ...(balances ? { balances: { ...(balances.source ? { source: balances.source } : {}), ...(balances.recipient ? { recipient: balances.recipient } : {}) } } : {}),
      createdAt: transfer.createdAt.toISOString()
    });
  }

  private balancesFromLedger(balances: readonly { walletId: string; currency: Currency; balanceAfterMinor: number }[], senderWalletId: string, recipientWalletId: string, currency: Currency): { source?: WalletBalanceDto; recipient?: WalletBalanceDto } {
    const source = balances.find((balance) => balance.walletId === senderWalletId && balance.currency === currency);
    const recipient = balances.find((balance) => balance.walletId === recipientWalletId && balance.currency === currency);
    return {
      ...(source ? { source: { currency: source.currency, amountMinor: source.balanceAfterMinor } } : {}),
      ...(recipient ? { recipient: { currency: recipient.currency, amountMinor: recipient.balanceAfterMinor } } : {})
    };
  }

  private toJson(response: TransferDto): InputJsonValue {
    return { ...response };
  }
}
