import type { Currency } from '@global-wallet/contracts';

export type ExchangeRate = {
  provider: string;
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: string;
  fetchedAt: Date;
  rawPayloadHash: string;
};

export interface ExchangeRateProvider {
  getRate(baseCurrency: Currency, quoteCurrency: Currency): Promise<ExchangeRate>;
}
