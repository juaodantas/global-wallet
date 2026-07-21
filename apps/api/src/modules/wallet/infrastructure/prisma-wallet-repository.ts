import type { PrismaClient } from '@prisma/client';
import { supportedCurrencies } from '@global-wallet/contracts';
import type { Currency, WalletBalanceDto, WalletDto } from '@global-wallet/contracts';
import { toUserId, type UserId } from '../../../shared/domain/ids.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { WalletWriteRepository } from '../application/create-wallet-for-user.js';
import type { WalletReadRepository } from '../application/get-wallet-for-user.js';

type WalletRecord = {
  id: string;
  userId: string;
  createdAt: Date;
  balances: Array<{ currency: Currency; amountMinor: bigint }>;
};

type PrismaLike = Pick<PrismaClient, 'wallet'>;

export class PrismaWalletRepository implements WalletWriteRepository, WalletReadRepository {
  constructor(private readonly prisma: PrismaLike) {}

  async createWalletWithBalances(input: { userId: UserId; currencies: readonly Currency[] }, transaction: unknown): Promise<void> {
    const client = this.resolveClient(transaction);
    await client.wallet.create({
      data: {
        userId: input.userId,
        balances: {
          create: input.currencies.map((currency) => ({ currency, amountMinor: 0 }))
        }
      }
    });
  }

  async findWalletByUserId(userId: UserId): Promise<WalletDto | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { balances: { select: { currency: true, amountMinor: true } } }
    });
    return wallet ? this.toWalletDto(wallet) : null;
  }

  private resolveClient(transaction: unknown): PrismaLike {
    if (this.hasWalletDelegate(transaction)) return transaction;
    return this.prisma;
  }

  private hasWalletDelegate(value: unknown): value is PrismaLike {
    return typeof value === 'object' && value !== null && 'wallet' in value;
  }

  private toWalletDto(wallet: WalletRecord): WalletDto {
    return {
      walletId: wallet.id,
      userId: toUserId(wallet.userId),
      supportedCurrencies: [...supportedCurrencies],
      balances: this.toBalances(wallet.balances),
      createdAt: wallet.createdAt.toISOString()
    };
  }

  private toBalances(balances: WalletRecord['balances']): WalletBalanceDto[] {
    return supportedCurrencies.map((currency) => {
      const balance = balances.find((candidate) => candidate.currency === currency);
      if (!balance) throw new AppError({ code: 'INTERNAL_ERROR', message: 'Wallet balance not found', statusCode: 500 });
      const amountMinor = Number(balance.amountMinor);
      if (!Number.isSafeInteger(amountMinor)) throw new AppError({ code: 'INTERNAL_ERROR', message: 'Wallet balance is too large', statusCode: 500 });
      return { currency, amountMinor };
    });
  }
}
