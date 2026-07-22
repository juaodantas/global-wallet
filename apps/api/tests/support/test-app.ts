import { createHmac } from 'node:crypto';
import { supportedCurrencies } from '@global-wallet/contracts';
import type { WalletDto } from '@global-wallet/contracts';
import type { AuthRepository, RegisterUserInput } from '../../src/modules/auth/application/auth-repository.js';
import { buildApp } from '../../src/app.js';
import type { AuthUser, PublicAuthUser, UserId } from '../../src/modules/auth/domain/types.js';
import type { CreateWalletForUserPort } from '../../src/modules/wallet/application/create-wallet-port.js';
import type { WalletReadRepository } from '../../src/modules/wallet/application/get-wallet-for-user.js';
import type { ExchangeRateProvider } from '../../src/modules/exchange/application/exchange-rate-provider.js';
import { toUserId } from '../../src/shared/domain/ids.js';
import { AppError } from '../../src/shared/errors/app-error.js';

export const testEnv = {
  NODE_ENV: 'test' as const,
  PORT: 3001,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/global_wallet?schema=public',
  JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
  WEB_ORIGIN: 'http://localhost:3000',
  FRANKFURTER_BASE_URL: 'https://api.frankfurter.app',
  FRANKFURTER_TIMEOUT_MS: 3000,
  FRANKFURTER_CACHE_TTL_MS: 300000,
  FRANKFURTER_RATE_LIMIT_WINDOW_MS: 60000,
  FRANKFURTER_RATE_LIMIT_MAX_REQUESTS: 60
};

function testUserId(sequence: number): UserId {
  return toUserId(`00000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`);
}

function testWalletId(sequence: number): string {
  return `00000000-0000-4000-8000-${(100000000000 + sequence).toString()}`;
}

function base64UrlJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function createSignedSessionJwtWithSubject(subject: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({ sub: subject, iat: now, exp: now + 60 * 60 * 24 * 7 });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', testEnv.JWT_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

class FakeAuthRepository implements AuthRepository {
  private readonly users = new Map<string, AuthUser>();
  private sequence = 0;

  async createUser(input: RegisterUserInput): Promise<PublicAuthUser> {
    if (this.users.has(input.email)) {
      throw new AppError({ code: 'EMAIL_ALREADY_EXISTS', message: 'Email already exists', statusCode: 409 });
    }
    this.sequence += 1;
    const user: AuthUser = {
      id: testUserId(this.sequence),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: new Date('2026-07-21T10:00:00.000Z')
    };
    this.users.set(user.email, user);
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.users.get(email) ?? null;
  }

  async findById(userId: UserId): Promise<PublicAuthUser | null> {
    const user = Array.from(this.users.values()).find((candidate) => candidate.id === userId);
    return user ? { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } : null;
  }

  async runInTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
    return callback({});
  }
}

export class FakeWalletStore implements CreateWalletForUserPort, WalletReadRepository {
  readonly createdFor: UserId[] = [];
  private readonly wallets = new Map<UserId, WalletDto>();

  async createWalletForUser(userId: UserId): Promise<void> {
    this.createdFor.push(userId);
    this.wallets.set(userId, {
      walletId: testWalletId(this.createdFor.length),
      userId,
      supportedCurrencies: [...supportedCurrencies],
      balances: supportedCurrencies.map((currency) => ({ currency, amountMinor: 0 })),
      createdAt: '2026-07-21T10:00:00.000Z'
    });
  }

  async findWalletByUserId(userId: UserId): Promise<WalletDto | null> {
    return this.wallets.get(userId) ?? null;
  }
}

export async function createTestApp(options: { exchangeRateProvider?: ExchangeRateProvider } = {}) {
  const authRepository = new FakeAuthRepository();
  const walletCreator = new FakeWalletStore();
  const app = await buildApp({
    env: testEnv,
    authRepository,
    walletCreator,
    walletRepository: walletCreator,
    ...(options.exchangeRateProvider ? { exchangeRateProvider: options.exchangeRateProvider } : {})
  });
  return { app, walletCreator };
}
