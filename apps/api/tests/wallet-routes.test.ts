import { describe, expect, it } from 'vitest';
import { supportedCurrencies, walletSchema } from '@global-wallet/contracts';
import { createTestApp } from './support/test-app.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function registerAndGetSessionCookie(app: Awaited<ReturnType<typeof createTestApp>>['app'], email: string): Promise<string> {
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email, password: 'secret123' } });
  expect(response.statusCode).toBe(201);
  const cookie = response.cookies.find((candidate) => candidate.name === 'gw_session');
  expect(cookie?.value).toBeTruthy();
  return cookie?.value ?? '';
}

describe('wallet routes', () => {
  it('rejects unauthenticated wallet reads', async () => {
    const { app } = await createTestApp();

    const response = await app.inject({ method: 'GET', url: '/wallet' });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('returns the authenticated user wallet with persisted zero balances and Feature 02 response shape', async () => {
    const { app } = await createTestApp();
    const sessionCookie = await registerAndGetSessionCookie(app, 'ada@example.com');

    const response = await app.inject({ method: 'GET', url: '/wallet', cookies: { gw_session: sessionCookie } });
    const payload: unknown = response.json();
    const parsed = walletSchema.safeParse(payload);

    expect(response.statusCode).toBe(200);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.walletId).toMatch(uuidPattern);
    expect(parsed.data.userId).toMatch(uuidPattern);
    expect(parsed.data.walletId).toBe('00000000-0000-4000-8000-100000000001');
    expect(parsed.data.userId).toBe('00000000-0000-4000-8000-000000000001');
    expect(parsed.data.supportedCurrencies).toEqual([...supportedCurrencies]);
    expect(parsed.data.balances).toEqual(supportedCurrencies.map((currency) => ({ currency, amountMinor: 0 })));
    expect(isRecord(payload)).toBe(true);
    if (!isRecord(payload)) return;
    expect(payload).not.toHaveProperty('referenceTotal');
    expect(payload).not.toHaveProperty('recentMovements');
    expect(payload).not.toHaveProperty('recentActivity');
    expect(payload).not.toHaveProperty('statement');
  });

  it('scopes wallet reads to the authenticated session user', async () => {
    const { app } = await createTestApp();
    const firstSessionCookie = await registerAndGetSessionCookie(app, 'ada@example.com');
    const secondSessionCookie = await registerAndGetSessionCookie(app, 'grace@example.com');

    const firstResponse = await app.inject({ method: 'GET', url: '/wallet', cookies: { gw_session: firstSessionCookie } });
    const secondResponse = await app.inject({ method: 'GET', url: '/wallet', cookies: { gw_session: secondSessionCookie } });
    const firstParsed = walletSchema.safeParse(firstResponse.json());
    const secondParsed = walletSchema.safeParse(secondResponse.json());

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(firstParsed.success).toBe(true);
    expect(secondParsed.success).toBe(true);
    if (!firstParsed.success || !secondParsed.success) return;
    expect(firstParsed.data.userId).toBe('00000000-0000-4000-8000-000000000001');
    expect(secondParsed.data.userId).toBe('00000000-0000-4000-8000-000000000002');
    expect(firstParsed.data.walletId).toBe('00000000-0000-4000-8000-100000000001');
    expect(secondParsed.data.walletId).toBe('00000000-0000-4000-8000-100000000002');
    expect(firstParsed.data.userId).not.toBe(secondParsed.data.userId);
    expect(firstParsed.data.walletId).not.toBe(secondParsed.data.walletId);
  });
});
