import type { UserId } from '../../../shared/domain/ids.js';

export interface CreateWalletForUserPort {
  createWalletForUser(userId: UserId, transaction: unknown): Promise<void>;
}
