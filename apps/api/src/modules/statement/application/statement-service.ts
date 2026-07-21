import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import {
  statementListSchema,
  statementDetailSchema,
  type StatementListDto,
  type StatementDetailDto,
  type StatementQueryDto,
  type StatementItemDto
} from '@global-wallet/contracts';
import type { UserId } from '../../../shared/domain/ids.js';
import { bigintToSafeNumber } from '../../../shared/db/decimal.js';
import { financialOperationNotFoundError } from '../domain/errors.js';

export class StatementService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(userId: UserId, query: StatementQueryDto): Promise<StatementListDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!wallet) return { items: [] };

    const where: Prisma.FinancialOperationWhereInput = {
      OR: [
        { primaryWalletId: wallet.id },
        { transfer: { recipientWalletId: wallet.id } }
      ]
    };

    if (query.type) {
      where.type = query.type as 'DEPOSIT' | 'TRANSFER' | 'EXCHANGE_CONVERSION' | 'REVERSAL';
    }

    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (query.from) createdAtFilter.gte = new Date(query.from);
    if (query.to) createdAtFilter.lte = new Date(query.to);
    if (Object.keys(createdAtFilter).length > 0) {
      where.createdAt = createdAtFilter;
    }

    if (query.currency) {
      where.entries = { some: { currency: query.currency as 'BRL' | 'USD' | 'EUR' | 'GBP' } };
    }

    const take = 21;
    const operations = await this.prisma.financialOperation.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        entries: {
          select: { walletId: true, currency: true, direction: true, amountMinor: true }
        },
        transfer: {
          select: { senderWalletId: true, recipientWalletId: true }
        },
        exchangeConversion: {
          select: { sourceCurrency: true, targetCurrency: true, sourceAmountMinor: true, targetAmountMinor: true }
        }
      }
    });

    const hasMore = operations.length === take;
    const items = operations.slice(0, 20);

    const mappedItems: StatementItemDto[] = items.map((op) => {
      const userEntries = op.entries.filter((e) => e.walletId === wallet.id);
      return this.buildItem(op, userEntries, wallet.id);
    });

    return statementListSchema.parse({
      items: mappedItems,
      ...(hasMore ? { nextCursor: items[items.length - 1]?.id } : {})
    });
  }

  async getDetail(userId: UserId, operationId: string): Promise<StatementDetailDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!wallet) throw financialOperationNotFoundError();

    const operation = await this.prisma.financialOperation.findFirst({
      where: {
        id: operationId,
        OR: [
          { primaryWalletId: wallet.id },
          { transfer: { recipientWalletId: wallet.id } }
        ]
      },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' }
        },
        transfer: {
          select: { senderWalletId: true, recipientWalletId: true }
        },
        exchangeConversion: {
          select: { sourceCurrency: true, targetCurrency: true, sourceAmountMinor: true, targetAmountMinor: true }
        }
      }
    });

    if (!operation) throw financialOperationNotFoundError();

    const userEntries = operation.entries.filter((e) => e.walletId === wallet.id);
    const item = this.buildItem(operation, userEntries, wallet.id);

    return statementDetailSchema.parse({
      operationId: item.operationId,
      type: item.type,
      status: item.status,
      primaryWalletId: wallet.id,
      currency: item.currency,
      amountMinor: item.amountMinor,
      direction: item.direction,
      source: item.source,
      target: item.target,
      originalOperationId: item.originalOperationId,
      reversalOperationId: item.reversalOperationId,
      correlationId: item.correlationId,
      entries: operation.entries.map((entry) => ({
        walletId: entry.walletId,
        currency: entry.currency,
        direction: entry.direction,
        amountMinor: bigintToSafeNumber(entry.amountMinor),
        balanceAfterMinor: bigintToSafeNumber(entry.balanceAfterMinor),
        createdAt: entry.createdAt.toISOString()
      })),
      createdAt: item.createdAt
    });
  }

  private buildItem(
    op: {
      id: string;
      type: 'DEPOSIT' | 'TRANSFER' | 'EXCHANGE_CONVERSION' | 'REVERSAL';
      status: 'COMPLETED' | 'REVERSED';
      originalOperationId: string | null;
      reversalOperationId: string | null;
      correlationId: string | null;
      createdAt: Date;
      entries: Array<{ walletId: string; currency: string; direction: 'DEBIT' | 'CREDIT'; amountMinor: bigint }>;
      transfer: { senderWalletId: string; recipientWalletId: string } | null;
      exchangeConversion: { sourceCurrency: string; targetCurrency: string; sourceAmountMinor: bigint; targetAmountMinor: bigint } | null;
    },
    userEntries: Array<{ walletId: string; currency: string; direction: 'DEBIT' | 'CREDIT'; amountMinor: bigint }>,
    _walletId: string
  ): StatementItemDto {
    let direction: 'CREDIT' | 'DEBIT' | 'MIXED';
    let currency: 'BRL' | 'USD' | 'EUR' | 'GBP';
    let amountMinor: number;
    let source: { currency: 'BRL' | 'USD' | 'EUR' | 'GBP'; amountMinor: number } | undefined;
    let target: { currency: 'BRL' | 'USD' | 'EUR' | 'GBP'; amountMinor: number } | undefined;

    if (op.type === 'EXCHANGE_CONVERSION') {
      direction = 'MIXED';
      const debitEntry = userEntries.find((e) => e.direction === 'DEBIT') ?? null;
      const creditEntry = userEntries.find((e) => e.direction === 'CREDIT') ?? null;
      const entry = debitEntry && creditEntry ? creditEntry : (userEntries[0] ?? op.entries[0]);
      currency = (entry?.currency ?? 'BRL') as 'BRL' | 'USD' | 'EUR' | 'GBP';
      amountMinor = entry ? bigintToSafeNumber(entry.amountMinor) : 0;
      if (debitEntry && creditEntry) {
        source = { currency: debitEntry.currency as 'BRL' | 'USD' | 'EUR' | 'GBP', amountMinor: bigintToSafeNumber(debitEntry.amountMinor) };
        target = { currency: creditEntry.currency as 'BRL' | 'USD' | 'EUR' | 'GBP', amountMinor: bigintToSafeNumber(creditEntry.amountMinor) };
      }
    } else {
      const entry = userEntries[0] ?? op.entries[0];
      direction = entry?.direction ?? 'CREDIT';
      currency = (entry?.currency ?? 'BRL') as 'BRL' | 'USD' | 'EUR' | 'GBP';
      amountMinor = entry ? bigintToSafeNumber(entry.amountMinor) : 0;
    }

    return {
      operationId: op.id,
      type: op.type,
      status: op.status,
      direction,
      currency,
      amountMinor,
      ...(source ? { source } : {}),
      ...(target ? { target } : {}),
      ...(op.originalOperationId ? { originalOperationId: op.originalOperationId } : {}),
      ...(op.reversalOperationId ? { reversalOperationId: op.reversalOperationId } : {}),
      ...(op.correlationId ? { correlationId: op.correlationId } : {}),
      createdAt: op.createdAt.toISOString()
    };
  }
}
