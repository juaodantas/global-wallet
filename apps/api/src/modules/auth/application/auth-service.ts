import type { AuthSessionDto } from '@global-wallet/contracts';
import { AppError } from '../../../shared/errors/app-error.js';
import type { CreateWalletForUserPort } from '../../wallet/application/create-wallet-port.js';
import { hashPassword, verifyPassword } from '../domain/password-hasher.js';
import type { PublicAuthUser, UserId } from '../domain/types.js';
import type { AuthRepository } from './auth-repository.js';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository, private readonly walletCreator: CreateWalletForUserPort) {}

  async register(input: { name: string; email: string; password: string }): Promise<AuthSessionDto> {
    const passwordHash = await hashPassword(input.password);
    const user = await this.authRepository.runInTransaction(async (transaction) => {
      const createdUser = await this.authRepository.createUser({ name: input.name, email: input.email, passwordHash }, transaction);
      await this.walletCreator.createWalletForUser(createdUser.id, transaction);
      return createdUser;
    });
    return this.toSession(user);
  }

  async login(input: { email: string; password: string }): Promise<AuthSessionDto> {
    const user = await this.authRepository.findByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials', statusCode: 401 });
    }
    return this.toSession(user);
  }

  async getCurrentUser(userId: UserId): Promise<AuthSessionDto> {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new AppError({ code: 'UNAUTHORIZED', message: 'Unauthorized', statusCode: 401 });
    return this.toSession(user);
  }

  private toSession(user: PublicAuthUser): AuthSessionDto {
    return {
      user: { userId: user.id, name: user.name, email: user.email, createdAt: user.createdAt.toISOString() },
      session: { authenticated: true }
    };
  }
}
