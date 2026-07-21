import { createHash } from 'node:crypto';
import type { Currency } from '@global-wallet/contracts';
import type { ExchangeRate, ExchangeRateProvider } from '../application/exchange-rate-provider.js';

const rates: Record<Currency, Record<Currency, string>> = {
  BRL: { BRL: '1.0000000000', USD: '0.2000000000', EUR: '0.1800000000', GBP: '0.1500000000' },
  USD: { BRL: '5.0000000000', USD: '1.0000000000', EUR: '0.9000000000', GBP: '0.7500000000' },
  EUR: { BRL: '5.5555555556', USD: '1.1111111111', EUR: '1.0000000000', GBP: '0.8333333333' },
  GBP: { BRL: '6.6666666667', USD: '1.3333333333', EUR: '1.2000000000', GBP: '1.0000000000' }
};

export class StaticExchangeRateProvider implements ExchangeRateProvider {
  async getRate(baseCurrency: Currency, quoteCurrency: Currency): Promise<ExchangeRate> {
    const rate = rates[baseCurrency][quoteCurrency];
    const fetchedAt = new Date();
    const rawPayloadHash = createHash('sha256').update(`${baseCurrency}:${quoteCurrency}:${rate}`).digest('hex');
    return { provider: 'mvp-exchange-rate-adapter', baseCurrency, quoteCurrency, rate, fetchedAt, rawPayloadHash };
  }
}
