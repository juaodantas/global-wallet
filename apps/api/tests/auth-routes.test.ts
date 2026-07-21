import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { supportedCurrencies } from '@global-wallet/contracts';
import type { WalletDto } from '@global-wallet/contracts';
import type { AuthRepository, RegisterUserInput } from '../src/modules/auth/application/auth-repository.js';
import { buildApp } from '../src/app.js';
import type { AuthUser, PublicAuthUser, UserId } from '../src/modules/auth/domain/types.js';
import type { CreateWalletForUserPort } from '../src/modules/wallet/application/create-wallet-port.js';
import type { WalletReadRepository } from '../src/modules/wallet/application/get-wallet-for-user.js';
import { toUserId } from '../src/shared/domain/ids.js';
import { AppError } from '../src/shared/errors/app-error.js';

const testEnv = {
  NODE_ENV: 'test' as const,
  PORT: 3001,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/global_wallet?schema=public',
  JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
  WEB_ORIGIN: 'http://localhost:3000'
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

function createSignedSessionJwtWithSubject(subject: string): string {
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

class FakeWalletStore implements CreateWalletForUserPort, WalletReadRepository {
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

async function createTestApp() {
  const authRepository = new FakeAuthRepository();
  const walletCreator = new FakeWalletStore();
  const app = await buildApp({ env: testEnv, authRepository, walletCreator, walletRepository: walletCreator });
  return { app, walletCreator };
}

describe('auth routes', () => {
  it('allows credentialed CORS for the configured web origin', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/auth/login',
      headers: {
        origin: testEnv.WEB_ORIGIN,
        'access-control-request-method': 'POST'
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(testEnv.WEB_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('registers a user, creates a wallet, sets cookie, and returns no token fields', async () => {
    const { app, walletCreator } = await createTestApp();
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ADA@example.com', password: 'secret123' } });

    expect(response.statusCode).toBe(201);
    expect(response.headers['set-cookie']).toContain('gw_session=');
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Lax');
    expect(walletCreator.createdFor).toHaveLength(1);
    const body = response.json();
    expect(body.user.email).toBe('ada@example.com');
    expect(JSON.stringify(body)).not.toMatch(/token|accessToken|jwt|refreshToken/i);
  });

  it('rejects a short registration password', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'short' } });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate email registration', async () => {
    const { app } = await createTestApp();
    const payload = { name: 'Ada', email: 'ada@example.com', password: 'secret123' };
    await app.inject({ method: 'POST', url: '/auth/register', payload });
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rejects invalid login credentials', async () => {
    const { app } = await createTestApp();
    await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'ada@example.com', password: 'wrongpass' } });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in successfully and sets cookie without token fields', async () => {
    const { app } = await createTestApp();
    await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'ada@example.com', password: 'secret123' } });

    expect(response.statusCode).toBe(200);
    expect(response.headers['set-cookie']).toContain('gw_session=');
    expect(JSON.stringify(response.json())).not.toMatch(/token|accessToken|jwt|refreshToken/i);
  });

  it('clears cookie on logout', async () => {
    const { app } = await createTestApp();
    const response = await app.inject({ method: 'POST', url: '/auth/logout' });

    expect(response.statusCode).toBe(204);
    expect(response.headers['set-cookie']).toContain('gw_session=');
    expect(response.headers['set-cookie']).toContain('Max-Age=0');
  });

  it('rejects a private request after logout clears the cookie', async () => {
    const { app } = await createTestApp();
    const registerResponse = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const sessionCookie = registerResponse.cookies[0];
    const logoutResponse = await app.inject({ method: 'POST', url: '/auth/logout', cookies: { gw_session: sessionCookie?.value ?? '' } });
    const clearedCookie = logoutResponse.cookies[0];

    const wallet = await app.inject({ method: 'GET', url: '/wallet', cookies: { gw_session: clearedCookie?.value ?? '' } });

    expect(wallet.statusCode).toBe(401);
    expect(wallet.json().error.code).toBe('UNAUTHORIZED');
  });

  it('requires cookie for auth me and succeeds with a valid cookie', async () => {
    const { app } = await createTestApp();
    const unauthorized = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json().error.code).toBe('UNAUTHORIZED');

    const registerResponse = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const cookie = registerResponse.cookies[0];
    expect(cookie?.name).toBe('gw_session');
    const me = await app.inject({ method: 'GET', url: '/auth/me', cookies: { gw_session: cookie?.value ?? '' } });

    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('ada@example.com');
  });

  it('rejects a tampered auth cookie', async () => {
    const { app } = await createTestApp();
    const registerResponse = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const cookie = registerResponse.cookies[0];

    const response = await app.inject({ method: 'GET', url: '/auth/me', cookies: { gw_session: `${cookie?.value ?? ''}tampered` } });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a validly signed auth cookie with a non-UUID subject', async () => {
    const { app } = await createTestApp();
    const token = createSignedSessionJwtWithSubject('not-a-uuid');

    const response = await app.inject({ method: 'GET', url: '/auth/me', cookies: { gw_session: token } });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('requires auth for wallet and returns a newly registered wallet with zero balances', async () => {
    const { app } = await createTestApp();
    const unauthorized = await app.inject({ method: 'GET', url: '/wallet' });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json().error.code).toBe('UNAUTHORIZED');

    const registerResponse = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
    const cookie = registerResponse.cookies[0];
    const wallet = await app.inject({ method: 'GET', url: '/wallet', cookies: { gw_session: cookie?.value ?? '' } });

    expect(wallet.statusCode).toBe(200);
    expect(wallet.json()).toEqual({
      walletId: '00000000-0000-4000-8000-100000000001',
      userId: '00000000-0000-4000-8000-000000000001',
      supportedCurrencies: ['BRL', 'USD', 'EUR', 'GBP'],
      balances: [
        { currency: 'BRL', amountMinor: 0 },
        { currency: 'USD', amountMinor: 0 },
        { currency: 'EUR', amountMinor: 0 },
        { currency: 'GBP', amountMinor: 0 }
      ],
      createdAt: '2026-07-21T10:00:00.000Z'
    });
  });
});
