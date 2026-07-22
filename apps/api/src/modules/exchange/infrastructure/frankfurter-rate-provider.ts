import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Currency } from '@global-wallet/contracts';
import { AppError } from '../../../shared/errors/app-error.js';
import type { ExchangeRate, ExchangeRateProvider } from '../application/exchange-rate-provider.js';
import { externalExchangeRateServiceFailureError, unsupportedCurrencyPairError } from '../domain/errors.js';

const frankfurterPayloadSchema = z.object({
  amount: z.number().positive().optional(),
  base: z.string().min(3),
  date: z.string().min(1),
  rates: z.record(z.number().positive())
});

type FrankfurterExchangeRateProviderOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
  fetchFn?: typeof fetch;
  now?: () => Date;
};

type CacheEntry = { rate: ExchangeRate; expiresAtMs: number };

const supportedCurrencies = ['BRL', 'USD', 'EUR', 'GBP'] as const satisfies readonly Currency[];

export class FrankfurterExchangeRateProvider implements ExchangeRateProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly rateLimitWindowMs: number;
  private readonly rateLimitMaxRequests: number;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => Date;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<ExchangeRate>>();
  private readonly requestTimestampsMs: number[] = [];

  constructor(options: FrankfurterExchangeRateProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.frankfurter.app';
    this.timeoutMs = options.timeoutMs ?? 3000;
    this.cacheTtlMs = options.cacheTtlMs ?? 300000;
    this.rateLimitWindowMs = options.rateLimitWindowMs ?? 60000;
    this.rateLimitMaxRequests = options.rateLimitMaxRequests ?? 60;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async getRate(baseCurrency: Currency, quoteCurrency: Currency): Promise<ExchangeRate> {
    if (baseCurrency === quoteCurrency || !this.isSupportedCurrency(baseCurrency) || !this.isSupportedCurrency(quoteCurrency)) throw unsupportedCurrencyPairError();
    const key = `${baseCurrency}:${quoteCurrency}`;
    const currentMs = this.now().getTime();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAtMs > currentMs) return cached.rate;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const request = this.fetchRate(baseCurrency, quoteCurrency, key);
    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async fetchRate(baseCurrency: Currency, quoteCurrency: Currency, key: string): Promise<ExchangeRate> {
    this.reserveRateLimitSlot();
    const fetchedAt = this.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL('/latest', this.baseUrl);
      url.searchParams.set('base', baseCurrency);
      url.searchParams.set('symbols', quoteCurrency);
      const response = await this.fetchFn(url, { signal: controller.signal });
      if (!response.ok) throw externalExchangeRateServiceFailureError();
      const rawPayload = await response.text();
      const decodedPayload: unknown = JSON.parse(rawPayload);
      const payload = frankfurterPayloadSchema.parse(decodedPayload);
      const quotedRate = payload.rates[quoteCurrency];
      if (payload.base !== baseCurrency || quotedRate === undefined) throw externalExchangeRateServiceFailureError();
      const rate: ExchangeRate = {
        provider: 'frankfurter',
        baseCurrency,
        quoteCurrency,
        rate: quotedRate.toFixed(10),
        fetchedAt,
        rawPayloadHash: createHash('sha256').update(rawPayload).digest('hex')
      };
      this.cache.set(key, { rate, expiresAtMs: fetchedAt.getTime() + this.cacheTtlMs });
      return rate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw externalExchangeRateServiceFailureError();
    } finally {
      clearTimeout(timeout);
    }
  }

  private reserveRateLimitSlot(): void {
    const currentMs = this.now().getTime();
    const windowStartMs = currentMs - this.rateLimitWindowMs;
    let oldestRequestMs = this.requestTimestampsMs.at(0);
    while (oldestRequestMs !== undefined && oldestRequestMs <= windowStartMs) {
      this.requestTimestampsMs.shift();
      oldestRequestMs = this.requestTimestampsMs.at(0);
    }
    if (this.requestTimestampsMs.length >= this.rateLimitMaxRequests) throw externalExchangeRateServiceFailureError();
    this.requestTimestampsMs.push(currentMs);
  }

  private isSupportedCurrency(currency: Currency): boolean {
    return supportedCurrencies.includes(currency);
  }
}
