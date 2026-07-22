import { describe, expect, it } from 'vitest';
import { brlExchangeRatesSchema, type Currency } from '@global-wallet/contracts';
import type { ExchangeRate, ExchangeRateProvider } from '../src/modules/exchange/application/exchange-rate-provider.js';
import { createTestApp } from './support/test-app.js';

class FakeRateProvider implements ExchangeRateProvider {
  readonly requestedPairs: string[] = [];

  async getRate(baseCurrency: Currency, quoteCurrency: Currency): Promise<ExchangeRate> {
    this.requestedPairs.push(`${baseCurrency}:${quoteCurrency}`);
    return { provider: 'frankfurter', baseCurrency, quoteCurrency, rate: `${baseCurrency === 'USD' ? '5' : baseCurrency === 'EUR' ? '6' : '7'}.0000000000`, fetchedAt: new Date('2026-07-21T10:00:00.000Z'), rawPayloadHash: 'hash' };
  }
}

async function registerAndGetSessionCookie(app: Awaited<ReturnType<typeof createTestApp>>['app']): Promise<string> {
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Ada', email: 'ada@example.com', password: 'secret123' } });
  const cookie = response.cookies.find((candidate) => candidate.name === 'gw_session');
  return cookie?.value ?? '';
}

describe('exchange rates routes', () => {
  it('rejects BRL rates DTOs with non-Frankfurter provider or duplicated currencies', () => {
    const validRate = { targetCurrency: 'BRL', unitAmount: 1, rate: '5.0000000000', provider: 'frankfurter', fetchedAt: '2026-07-21T10:00:00.000Z' };

    expect(
      brlExchangeRatesSchema.safeParse({
        baseCurrency: 'BRL',
        rates: [
          { ...validRate, sourceCurrency: 'USD', provider: 'static' },
          { ...validRate, sourceCurrency: 'EUR' },
          { ...validRate, sourceCurrency: 'GBP' }
        ]
      }).success
    ).toBe(false);
    expect(
      brlExchangeRatesSchema.safeParse({
        baseCurrency: 'BRL',
        rates: [
          { ...validRate, sourceCurrency: 'USD' },
          { ...validRate, sourceCurrency: 'USD' },
          { ...validRate, sourceCurrency: 'GBP' }
        ]
      }).success
    ).toBe(false);
  });

  it('requires authentication for BRL reference rates', async () => {
    const { app } = await createTestApp({ exchangeRateProvider: new FakeRateProvider() });

    const response = await app.inject({ method: 'GET', url: '/exchange/rates/brl' });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('returns read-only USD/EUR/GBP rates to BRL without using quote creation', async () => {
    const provider = new FakeRateProvider();
    const { app } = await createTestApp({ exchangeRateProvider: provider });
    const sessionCookie = await registerAndGetSessionCookie(app);

    const response = await app.inject({ method: 'GET', url: '/exchange/rates/brl', cookies: { gw_session: sessionCookie } });
    const parsed = brlExchangeRatesSchema.safeParse(response.json());

    expect(response.statusCode).toBe(200);
    expect(parsed.success).toBe(true);
    expect(provider.requestedPairs).toEqual(['USD:BRL', 'EUR:BRL', 'GBP:BRL']);
  });
});
