import { describe, expect, it } from 'vitest';
import type { Currency } from '@global-wallet/contracts';
import { FrankfurterExchangeRateProvider } from '../src/modules/exchange/infrastructure/frankfurter-rate-provider.js';
import { AppError } from '../src/shared/errors/app-error.js';

function jsonResponse(payload: object, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('FrankfurterExchangeRateProvider', () => {
  it('validates and normalizes a successful Frankfurter payload', async () => {
    const provider = new FrankfurterExchangeRateProvider({
      now: () => new Date('2026-07-21T10:00:00.000Z'),
      fetchFn: async () => jsonResponse({ amount: 1, base: 'USD', date: '2026-07-21', rates: { BRL: 5.4321 } })
    });

    const rate = await provider.getRate('USD', 'BRL');

    expect(rate).toMatchObject({ provider: 'frankfurter', baseCurrency: 'USD', quoteCurrency: 'BRL', rate: '5.4321000000', fetchedAt: new Date('2026-07-21T10:00:00.000Z') });
    expect(rate.rawPayloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reuses cache within TTL and refreshes after expiry', async () => {
    let currentMs = Date.parse('2026-07-21T10:00:00.000Z');
    let calls = 0;
    const provider = new FrankfurterExchangeRateProvider({
      cacheTtlMs: 1000,
      now: () => new Date(currentMs),
      fetchFn: async () => {
        calls += 1;
        return jsonResponse({ base: 'USD', date: '2026-07-21', rates: { BRL: calls === 1 ? 5 : 6 } });
      }
    });

    await expect(provider.getRate('USD', 'BRL')).resolves.toMatchObject({ rate: '5.0000000000' });
    currentMs += 500;
    await expect(provider.getRate('USD', 'BRL')).resolves.toMatchObject({ rate: '5.0000000000' });
    currentMs += 1000;
    await expect(provider.getRate('USD', 'BRL')).resolves.toMatchObject({ rate: '6.0000000000' });
    expect(calls).toBe(2);
  });

  it('does not return expired cache as fallback after an external failure', async () => {
    let currentMs = Date.parse('2026-07-21T10:00:00.000Z');
    let calls = 0;
    const provider = new FrankfurterExchangeRateProvider({
      cacheTtlMs: 1000,
      now: () => new Date(currentMs),
      fetchFn: async () => {
        calls += 1;
        return calls === 1 ? jsonResponse({ base: 'USD', date: '2026-07-21', rates: { BRL: 5 } }) : jsonResponse({ message: 'unavailable' }, 503);
      }
    });

    await expect(provider.getRate('USD', 'BRL')).resolves.toMatchObject({ rate: '5.0000000000' });
    currentMs += 1001;

    await expect(provider.getRate('USD', 'BRL')).rejects.toMatchObject({ code: 'EXTERNAL_SERVICE_FAILURE' });
    expect(calls).toBe(2);
  });

  it('fails with an external service error on timeout and non-OK HTTP responses', async () => {
    const timeoutProvider = new FrankfurterExchangeRateProvider({
      timeoutMs: 1,
      fetchFn: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
        })
    });
    await expect(timeoutProvider.getRate('USD', 'BRL')).rejects.toMatchObject({ code: 'EXTERNAL_SERVICE_FAILURE' });

    const httpErrorProvider = new FrankfurterExchangeRateProvider({ fetchFn: async () => jsonResponse({ message: 'unavailable' }, 503) });
    await expect(httpErrorProvider.getRate('USD', 'BRL')).rejects.toMatchObject({ code: 'EXTERNAL_SERVICE_FAILURE' });
  });

  it('deduplicates concurrent calls for the same pair', async () => {
    let calls = 0;
    const provider = new FrankfurterExchangeRateProvider({
      fetchFn: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return jsonResponse({ base: 'EUR', date: '2026-07-21', rates: { BRL: 6.1 } });
      }
    });

    const [first, second] = await Promise.all([provider.getRate('EUR', 'BRL'), provider.getRate('EUR', 'BRL')]);

    expect(first.rate).toBe('6.1000000000');
    expect(second.rate).toBe('6.1000000000');
    expect(calls).toBe(1);
  });

  it('fails with an external service error for invalid payloads and local rate limit', async () => {
    const invalidProvider = new FrankfurterExchangeRateProvider({ fetchFn: async () => jsonResponse({ base: 'USD', date: '2026-07-21', rates: {} }) });
    await expect(invalidProvider.getRate('USD', 'BRL')).rejects.toMatchObject({ code: 'EXTERNAL_SERVICE_FAILURE' });

    const limitedProvider = new FrankfurterExchangeRateProvider({
      rateLimitMaxRequests: 1,
      rateLimitWindowMs: 60000,
      fetchFn: async (input) => {
        const url = new URL(input.toString());
        const base = url.searchParams.get('base') as Currency;
        return jsonResponse({ base, date: '2026-07-21', rates: { BRL: 5, USD: 0.2 } });
      }
    });
    await limitedProvider.getRate('USD', 'BRL');
    await expect(limitedProvider.getRate('BRL', 'USD')).rejects.toBeInstanceOf(AppError);
    await expect(limitedProvider.getRate('BRL', 'USD')).rejects.toMatchObject({ code: 'EXTERNAL_SERVICE_FAILURE' });
  });
});
