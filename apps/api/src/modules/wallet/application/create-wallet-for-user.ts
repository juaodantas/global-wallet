import { supportedCurrencies } from '@global-wallet/contracts';
import type { UserId } from '../../../shared/domain/ids.js';
import type { CreateWalletForUserPort } from './create-wallet-port.js';

export interface WalletWriteRepository {
  createWalletWithBalances(input: { userId: UserId; currencies: typeof supportedCurrencies }, transaction: unknown): Promise<void>;
}

export class CreateWalletForUserUseCase implements CreateWalletForUserPort {
  constructor(private readonly walletRepository: WalletWriteRepository) {}

  async createWalletForUser(userId: UserId, transaction: unknown): Promise<void> {
    await this.walletRepository.createWalletWithBalances({ userId, currencies: supportedCurrencies }, transaction);
  }
}
