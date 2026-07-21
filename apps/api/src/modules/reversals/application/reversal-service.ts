import { Prisma, type PrismaClient } from '@prisma/client';
import { reversalResponseSchema, financialOperationSchema, type ReversalDto } from '@global-wallet/contracts';
import { canonicalPayloadHash } from '../../../shared/idempotency/canonical-payload-hash.js';
import type { LedgerPostingService } from '../../ledger/application/ledger-posting-service.js';
import { toPositiveMinorAmount } from '../../ledger/domain/types.js';
import type { UserId } from '../../../shared/domain/ids.js';
import { toWalletId, toFinancialOperationId } from '../../../shared/domain/ids.js';
import { bigintToSafeNumber } from '../../../shared/db/decimal.js';
import { acquireIdempotencyScopeLock, idempotencyConflictError, missingStoredResponseError } from '../../../shared/db/idempotency.js';
import { financialOperationNotFoundError, operationNotReversibleError, operationAlreadyReversedError } from '../domain/errors.js';

type OriginalOperationRecord = {
  id: string;
  type: string;
  status: string;
  createdAt: Date;
  originalOperationId: string | null;
  reversalOperationId: string | null;
  primaryWalletId: string;
  entries: { id: string; walletId: string; currency: string; direction: string; amountMinor: bigint }[];
  transfer: { senderWalletId: string; recipientWalletId: string } | null;
};

export class ReversalService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledger: LedgerPostingService
  ) {}

  async create(input: { userId: UserId; operationId: string; reason?: string; idempotencyKey: string }): Promise<ReversalDto> {
    const endpoint = 'POST /financial-operations/:operationId/reversal';
    const payloadHash = canonicalPayloadHash({ operationId: input.operationId, reason: input.reason ?? null });

    return this.prisma.$transaction(async (transaction) => {
      await acquireIdempotencyScopeLock(transaction, { userId: input.userId, endpoint, key: input.idempotencyKey });

      const existing = await transaction.idempotencyRecord.findFirst({
        where: { userId: input.userId, endpoint, key: input.idempotencyKey }
      });
      if (existing) return this.replay(existing, payloadHash);

      const wallet = await transaction.wallet.findUnique({
        where: { userId: input.userId },
        select: { id: true }
      });
      if (!wallet) throw financialOperationNotFoundError();

      const originalOperation = await transaction.financialOperation.findFirst({
        where: {
          id: input.operationId,
          OR: [
            { primaryWalletId: wallet.id },
            { transfer: { recipientWalletId: wallet.id } }
          ]
        },
        include: {
          entries: { where: { walletId: wallet.id } },
          transfer: { select: { senderWalletId: true, recipientWalletId: true } }
        }
      });

      if (!originalOperation) throw financialOperationNotFoundError();

      if (originalOperation.type === 'REVERSAL') throw operationNotReversibleError();
      if (originalOperation.reversalOperationId) throw operationAlreadyReversedError();
      if (originalOperation.status === 'REVERSED') throw operationAlreadyReversedError();

      if (originalOperation.entries.length === 0) {
        throw operationNotReversibleError();
      }

      const compensatingEntries = originalOperation.entries.map((entry) => ({
        walletId: toWalletId(entry.walletId),
        currency: entry.currency,
        direction: entry.direction === 'CREDIT' ? 'DEBIT' as const : 'CREDIT' as const,
        amountMinor: toPositiveMinorAmount(bigintToSafeNumber(entry.amountMinor))
      }));

      const idempotencyRecord = await transaction.idempotencyRecord.create({
        data: { userId: input.userId, endpoint, key: input.idempotencyKey, payloadHash }
      });

      const ledgerResult = await this.ledger.postReversalInTransaction(transaction, {
        actorUserId: input.userId,
        primaryWalletId: toWalletId(originalOperation.primaryWalletId),
        originalOperationId: toFinancialOperationId(originalOperation.id),
        idempotencyRecordId: idempotencyRecord.id,
        entries: compensatingEntries
      });

      const response = {
        reversalId: ledgerResult.operationId,
        originalOperation: financialOperationSchema.parse({
          operationId: originalOperation.id,
          type: originalOperation.type,
          status: originalOperation.status,
          createdAt: originalOperation.createdAt.toISOString(),
          ...(originalOperation.originalOperationId ? { originalOperationId: originalOperation.originalOperationId } : {}),
          ...(originalOperation.reversalOperationId ? { reversalOperationId: originalOperation.reversalOperationId } : {})
        }),
        reversalOperation: financialOperationSchema.parse({
          operationId: ledgerResult.operationId,
          type: 'REVERSAL' as const,
          status: ledgerResult.status,
          createdAt: ledgerResult.createdAt,
          originalOperationId: originalOperation.id
        }),
        ...(input.reason ? { reason: input.reason } : {}),
        createdAt: ledgerResult.createdAt
      };

      const validatedResponse = reversalResponseSchema.parse(response);

      await transaction.idempotencyRecord.update({
        where: { id: idempotencyRecord.id },
        data: { storedResponse: this.toJson(validatedResponse) }
      });

      return validatedResponse;
    });
  }

  private replay(record: { payloadHash: string; storedResponse: Prisma.JsonValue | null }, payloadHash: string): ReversalDto {
    if (record.payloadHash !== payloadHash) throw idempotencyConflictError();
    if (!record.storedResponse) throw missingStoredResponseError();
    return reversalResponseSchema.parse(record.storedResponse);
  }

  private toJson(response: ReversalDto): Prisma.InputJsonObject {
    return { ...response };
  }
}
