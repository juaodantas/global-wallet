import type { WalletDto } from '@global-wallet/contracts';
import type { UserId } from '../../../shared/domain/ids.js';
import { AppError } from '../../../shared/errors/app-error.js';

export interface WalletReadRepository {
  findWalletByUserId(userId: UserId): Promise<WalletDto | null>;
}

export class GetWalletForUserQuery {
  constructor(private readonly walletRepository: WalletReadRepository) {}

  async execute(userId: UserId): Promise<WalletDto> {
    const wallet = await this.walletRepository.findWalletByUserId(userId);
    if (!wallet) throw new AppError({ code: 'WALLET_NOT_FOUND', message: 'Wallet not found', statusCode: 404 });
    return wallet;
  }
}
